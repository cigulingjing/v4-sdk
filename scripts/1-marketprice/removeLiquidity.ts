import { Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, SALT } from "../config";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/ERC20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { ModifyPositionParams } from "../lib/types";

async function removeLiq(liqPool: Contract, priceLower: number, priceUpper: number, amount0: bigint, amount1: bigint, poolKey: any): Promise<void> {

    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing);
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);
    const sqrtCurrent = await getPoolSqrtPrice(liqPool);
    const [liqDelta, amount0Rmv, amount1Rmv] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0, amount1);
    console.log(`Attempting to remove liquidity ${liqDelta} to price range [${priceLower}, ${priceUpper}] with amount0[${amount0Rmv.toString()}], amount1[${amount1Rmv.toString()}]`);

    const modifyPositionParams: ModifyPositionParams = {
        tickLower: ticklow,
        tickUpper: tickhigh,
        liquidityDelta: liqDelta * BigInt(-1),
    };
    await modifyPosition(liqPool, modifyPositionParams, "0x00");
}

async function main(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const liqPoolAddress = CONTRACT_ADDRESSES.LiquidPool;

    const token0=await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token0, wallet);
    const token1=await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token1, wallet);
    const liqPool=await ethers.getContractAt(CONTRACTS['LiquidPool'].abi,liqPoolAddress,  wallet);

    let poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.address} before removing liquidity is ${poolPrice}`);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before removing liquidity:", token0Before.toString());
    console.log("Token1 balance before removing liquidity:", token1Before.toString());

    const priceLower = 0.5;
    const priceUpper = 1.5;
    const amount0 = 100n;
    const amount1 = 100n;

    await removeLiq(liqPool, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);

    poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.address} after removing liquidity is ${poolPrice}`);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
