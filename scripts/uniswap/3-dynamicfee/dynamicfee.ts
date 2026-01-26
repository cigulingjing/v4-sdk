import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { PoolKey, SwapParams, ModifyPositionParams } from "../lib/types";

let provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
let wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider)



function calculateTickFromPrice(price: number, tickSpacing = 60): number {
    let unroundedTick = Math.floor(Math.log(price) / Math.log(1.0001));
    return Math.round(unroundedTick / tickSpacing) * tickSpacing;
}

async function checkAllowance(contract: Contract, ownerAddress: string, spenderAddress: string) {
    // Check the amount of tokens that an owner allowed to a spender
    let allowance = await contract.allowance(ownerAddress, spenderAddress);
    console.log(`Allowance: ${allowance.toString()}`);
}

async function isdepolyed(address: string) {
    let code = await provider.getCode(address);
    if (code !== "0x") {
        console.log(`The contract ${address} has been deployed.`);
    } else {
        console.log(`The contract ${address} has not been deployed. `);
    }
}

async function donate(contract: Contract, poolKey: PoolKey, amount0: bigint, amount1: bigint) {
    // Donate
    console.log("begin donate")
    let to0params = {
        tickLower: 840000, // lower price 0.5
        tickUpper: 876600, // upper price 1.5
        liquidityDelta: 0
    }
    let tx1 = await contract.setPositionParameters(poolKey, to0params);
    await tx1.wait();
    let swapParams = {
        zeroForOne: false,
        amountSpecified: 0,
        sqrtPriceLimitX96: 0
    }
    let tx2 = await contract.setSwapParameters(poolKey, swapParams);
    await tx2.wait();

    let tx3 = await contract.setDonateParameters(poolKey, amount0, amount1);
    await tx3.wait();

    let tx4 = await contract.donate();
    await tx4.wait();

    console.log("donate successfully");
}

async function modifyPosition(contract: Contract, poolKey: PoolKey, modifyPositionParams: ModifyPositionParams) {
    // Set position parameters
    let tx = await contract.setPositionParameters(poolKey, modifyPositionParams);
    await tx.wait();
    console.log("Position parameters set successfully");
    // Add liquidity
    tx = await contract.addLiquidity();
    await tx.wait();
}
//function kill(IPoolManager.PoolKey calldata key, int24 tickLower, bool zeroForOne, address to)
async function killLimitOrder(contract: Contract, poolKey: PoolKey, tickLower: number, zeroForOne: boolean, to: string) {
    let tx = await contract.kill(poolKey, tickLower, zeroForOne, to);
    await tx.wait();
    console.log("kill successfully");
    //emit Kill(msg.sender, epoch, key, tickLower, zeroForOne, liquidity);
    await contract.on("Kill", (owner, epoch, key, tickLower, zeroForOne, liquidity, event) => {
        console.log("Kill event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Key: ", key);
        console.log("TickLower: ", tickLower.toString());
        console.log("ZeroForOne: ", zeroForOne);
        console.log("Liquidity: ", liquidity.toString());

        // Handle event here
    });
}

async function placeLimitOrder(contract: Contract, poolKey: PoolKey, tickLower: number, zeroForOne: boolean, liquidity: number) {
    let tx = await contract.place(poolKey, tickLower, zeroForOne, liquidity);
    await tx.wait();
    console.log("limit order set successfully");

    await contract.on("Place", (owner, epoch, key, tickLower, zeroForOne, liquidity, event) => {
        console.log("Place event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Key: ", key);
        console.log("TickLower: ", tickLower.toString());
        console.log("ZeroForOne: ", zeroForOne);
        console.log("Liquidity: ", liquidity.toString());

        // Handle event here
    });
}

async function withdrawLimitOrder(contract: Contract, epoch: number, to: string) {
    let tx = await contract.withdraw(epoch, to);
    await tx.wait();
    console.log("limit order withdraw successfully");
    await contract.on("Withdraw", (owner, epoch, liquidity, event) => {
        console.log("Withdraw event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Liquidity: ", liquidity.toString());
    });
}

async function initialize(contract: Contract, key: PoolKey, sqrtPriceX96: bigint) {
    let tick = await contract.initialize(key, sqrtPriceX96);
    console.log(`Returned tick: ${JSON.stringify(tick)}`);
}

async function approveERC20(contract: Contract, toAddress: string, amount: bigint) {
    let tx = await contract.approve(toAddress, amount);
    let receipt = await tx.wait();
    console.log(`Transaction hash: ${receipt.transactionHash}`);
}

function getPoolId(poolKey: PoolKey): string {
    return ethers.utils.solidityKeccak256(
        ["bytes"],
        [ethers.utils.defaultAbiCoder.encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )]
    );
}

async function getSlot0(contract: Contract, poolKey: PoolKey) {
    let poolId = getPoolId(poolKey);
    console.log(`PoolId: ${poolId}`);
    let slot0 = await contract.getSlot0(poolId);
    console.log(`Returned slot0: ${JSON.stringify(slot0)}`);
}

async function getLiquidity(contract: Contract, poolKey: PoolKey) {
    let poolId = getPoolId(poolKey);
    console.log(`PoolId: ${poolId}`);
    //let liq0 = await contract.getLiquidity(poolId);
    let liq0 = await contract.functions['getLiquidity(bytes32)'](poolId);

    console.log(`Returned liquidity: ${liq0}`);
}

async function getERC20Balance(contract: Contract, address: string) {
    // 查询ERC20余额
    let balance = await contract.balanceOf(address);
    console.log(`ERC20 Balance: ${balance.toString()}`);
    return balance;
}

async function executeSwap(contract: Contract, poolKey: PoolKey, swapParams: SwapParams) {

    // Set position parameters
    console.log("begin swap")
    let to0params = {
        tickLower: 840000, // lower price 0.5
        tickUpper: 876600, // upper price 1.5
        liquidityDelta: 0
    }
    let tx1 = await contract.setPositionParameters(poolKey, to0params);
    await tx1.wait();
    let tx2 = await contract.setSwapParameters(poolKey, swapParams);
    console.log("begin swap1")
    await tx2.wait();
    console.log("Position parameters set successfully");
    // swap
    let tx3 = await contract.executeSwap();
    await tx3.wait();
}

async function depolyContract(contractName: string, params?: any): Promise<Contract> {
    const Factory = await ethers.getContractFactory(contractName);
    let contract;
    if (params === undefined) {
        contract = await Factory.deploy();
    } else {
        console.log(`params: ${JSON.stringify(params)}`);
        contract = await Factory.deploy(params);
        //depolyContract("depoly1");
    }
    await contract.deployed();
    console.log(`${contractName} deployed to ${contract.address}`);
    return contract;
}

async function delay(milliseconds: any) {
    // 这个新的 Promise 将在指定的毫秒数后 resolve
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

describe("PoolManager", function () {
    it("Should return the new greeting once it's changed", async function () {
        const token0 = await depolyContract("Token0");
        const token1 = await depolyContract("Token1");
        // await isdepolyed(token0.address);
        // await isdepolyed(token1.address);
        const totalSupply0 = await token0.totalSupply();
        console.log(`Token0 deployed to ${token0.address} with an initial supply ${totalSupply0}`);
        const totalSupply1 = await token1.totalSupply();
        console.log(`Token1 deployed to ${token1.address} with an initial supply ${totalSupply1}`);
        getERC20Balance(token0, wallet.address);
        getERC20Balance(token1, wallet.address);
        const token0Address = token0.address < token1.address ? token0.address : token1.address;
        const token1Address = token0.address > token1.address ? token0.address : token1.address;
        //await isdepolyed(token0Address);
        //await isdepolyed(token1Address);

        //depoly poolManager
        const poolManager = await depolyContract("PoolManager", 88888888888);
        // const Factory = await ethers.getContractFactory("PoolManager");
        // const controllerGasLimit = 88888888888;
        // const contractpm = await Factory.deploy(controllerGasLimit);
        // await contractpm.deployed();
        const poolManagerAddress = poolManager.address;
        //console.log("PoolManager Contract deployed to:", poolManagerAddress);
        await isdepolyed(poolManagerAddress);

        //depoly hook
        // 部署 LimitOrder 合约
        const dynamicFee = await depolyContract("DynamicFee", poolManagerAddress);
        console.log("LimitOrder Contract deployed to:", dynamicFee.address);
        // await isdepolyed(limitOrder.address);

        //initial poolManager
        let sqrtPriceX96 = BigInt("792281625142643375935439503360")// price = 100 token1/token0
        const DYNAMIC_FEE_FLAG = 0x800000;
        let poolKey: PoolKey = {
            currency0: token0Address,
            currency1: token1Address,
            fee: DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: dynamicFee.address,
        };
        //await getSlot0(poolManager, poolKey);
        await initialize(poolManager, poolKey, sqrtPriceX96);
        //await getSlot0(poolManager, poolKey);

        //approve ERC20 token to limitOrder
        //await approveERC20(token0,poolManager.address,ethers.utils.parseUnits("21000000", 18))
        //await approveERC20(token1,poolManager.address,ethers.utils.parseUnits("21000000", 18))

        const MyLiquidityProvider = await depolyContract("MyLiquidityProvider", poolManagerAddress);
        //approve ERC20 token to MyLiquidityProvider
        const wei = ethers.utils.parseUnits("21000000", 18).toBigInt();
        await approveERC20(token0, MyLiquidityProvider.address, wei);
        await approveERC20(token1, MyLiquidityProvider.address, wei);

        //add liquidity
        let modifyPositionParams: ModifyPositionParams = {
            tickLower: 45000, // lower price 90
            tickUpper: 46980, // upper price 110
            //liquidityDelta: 194868329805051412324060
            liquidityDelta: BigInt('10000000000000000000000')// 10000token0 10000token1
        };

        //console.log(`modifyPositionParams: ${JSON.stringify(modifyPositionParams)}`);
        //console.log(`Poolkey: ${JSON.stringify(poolKey)}`);
        await getERC20Balance(token0, wallet.address);
        await getERC20Balance(token1, wallet.address);

        await modifyPosition(MyLiquidityProvider, poolKey, modifyPositionParams);
        console.log("Liquidity added successfully");

        await getERC20Balance(token0, wallet.address);
        await getERC20Balance(token1, wallet.address);
        //swap
        let sqrtpricelimit = ethers.BigNumber.from('7922816251426433759354395033600').toBigInt();
        let amountswap = ethers.BigNumber.from('1083456789101112134000').toBigInt();
        console.log("amountswap:", amountswap.toString())

        let swapParams: SwapParams = {
            zeroForOne: false,
            amountSpecified: amountswap,
            sqrtPriceLimitX96: sqrtpricelimit
        }
        //console.log("sprtprice to price",sqrtPricetoPrice(pricetoSqrtPrice(110)))

        let token0beforswap = await getERC20Balance(token0, wallet.address);
        let token1beforswap = await getERC20Balance(token1, wallet.address);

        //await getSlot0(poolManager, poolKey);
        await executeSwap(MyLiquidityProvider, poolKey, swapParams);
        //await getSlot0(poolManager, poolKey);


        console.log("swap successfully");
        let token0afterswap = await getERC20Balance(token0, wallet.address);
        let token1afterswap = await getERC20Balance(token1, wallet.address);

        console.log("token0 change:", token0afterswap.sub(token0beforswap).toString())
        console.log("token1 change:", token1afterswap.sub(token1beforswap).toString())
        //price=token0 change/token1 change
        console.log("price:", token1afterswap.sub(token1beforswap).toString() / token0afterswap.sub(token0beforswap).toString())

        token0beforswap = await getERC20Balance(token0, wallet.address);
        token1beforswap = await getERC20Balance(token1, wallet.address);

        //await getSlot0(poolManager, poolKey);
        await executeSwap(MyLiquidityProvider, poolKey, swapParams);
        //await getSlot0(poolManager, poolKey);


        console.log("swap successfully");
        token0afterswap = await getERC20Balance(token0, wallet.address);
        token1afterswap = await getERC20Balance(token1, wallet.address);

        console.log("token0 change:", token0afterswap.sub(token0beforswap).toString())
        console.log("token1 change:", token1afterswap.sub(token1beforswap).toString())
        //price=token0 change/token1 change
        console.log("price:", token1afterswap.sub(token1beforswap).toString() / token0afterswap.sub(token0beforswap).toString())

    })
});
