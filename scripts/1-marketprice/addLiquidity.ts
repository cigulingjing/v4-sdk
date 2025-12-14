import {ethers} from "hardhat";
import {Wallet , Contract} from "ethers";

import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, SALT } from "../config";
import { ModifyPositionParams, PoolKey } from "../lib/types";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/erc20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";

async function addLiq(wallet: Wallet, priceLower: number, priceUpper: number, amount0: bigint, amount1: bigint, poolKey: PoolKey): Promise<void> {
    const token0 = new Contract(CONTRACT_ADDRESSES.Token0, CONTRACTS['MockERC20'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.Token1, CONTRACTS['MockERC20'].abi, wallet);
    const liqPool = new Contract(CONTRACT_ADDRESSES.LiquidPool, CONTRACTS['LiquidPool'].abi, wallet);

    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing);
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);
    const sqrtCurrent = await getPoolSqrtPrice(liqPool);

    const [liqDelta, amount0Add, amount1Add] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0, amount1);
    console.log(`Attempting to add liquidity ${liqDelta} to price range [${priceLower}, ${priceUpper}] with amount0&1 [${amount0Add.toString()}, ${amount1Add.toString()}]`);

    let modifyPositionParams: ModifyPositionParams = {
        tickLower: ticklow,
        tickUpper: tickhigh,
        liquidityDelta: liqDelta,
    };
    console.log("Modify position params:", modifyPositionParams);

    // Check ERC20 token balances and approve if necessary
    const liqPoolAddr = liqPool.address;
    if (!(await isApproved(token0, wallet.address, liqPoolAddr, amount0Add))) {
        await approveERC20(token0, liqPoolAddr, amount0Add);
    }

    if (!(await isApproved(token1, wallet.address, liqPoolAddr, amount1Add))) {
        await approveERC20(token1, liqPoolAddr, amount1Add);
    }

    await modifyPosition(liqPool, modifyPositionParams, "0x00");
}

async function main(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);
    const tokenContractName="MockERC20";
    const liqPoolAddress= CONTRACT_ADDRESSES.LiquidPool;

    const token0=await ethers.getContractAt(tokenContractName, CONTRACT_ADDRESSES.Token0, wallet);
    const token1=await ethers.getContractAt(tokenContractName, CONTRACT_ADDRESSES.Token1, wallet);
    const liqPool=await ethers.getContractAt("LiquidPool",liqPoolAddress,  wallet);

    const token0Before = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1Before = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 balance before adding liquidity:", token0Before.toString());
    console.log("Token1 balance before adding liquidity:", token1Before.toString());

    let poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool(${liqPoolAddress}) before adding liquidity is ${poolPrice}`);

    const priceLower = 50;
    const priceUpper = 200;
    const amount0 = ethers.utils.parseEther("1000").toBigInt();
    const amount1 = ethers.utils.parseEther("1000").toBigInt();
    await addLiq(wallet, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);

    poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPoolAddress} after adding liquidity is ${poolPrice} (Adding liquidity does not impact the asset price).`);

    const token0After = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1After = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
