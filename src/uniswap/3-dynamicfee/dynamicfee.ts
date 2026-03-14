import { ethers } from "ethers";
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
    // Note: getContractFactory is from hardhat-ethers, we cast to any to bypass type checking in dts build
    const Factory = await (ethers as any).getContractFactory(contractName);
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

