import { Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, SALT } from "../config";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance } from "../lib/erc20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { ModifyPositionParams } from "../lib/types";

async function removeLiq(wallet: Wallet, priceLower: number, priceUpper: number, amount0: bigint, amount1: bigint, poolKey: any): Promise<void> {
    const liqPool = new Contract(CONTRACT_ADDRESSES.LiquidPool, CONTRACTS['LiquidityPool'].abi, wallet);

    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing);
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);
    const sqrtCurrent = await getPoolSqrtPrice(liqPool);
    const [liqDelta, amount0Rmv, amount1Rmv] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0, amount1);
    console.log(`Attempting to remove liquidity ${liqDelta} to price range [${priceLower}, ${priceUpper}] with amount0&1 [${amount0Rmv.toString()}, ${amount1Rmv.toString()}]`);

    const modifyPositionParams: ModifyPositionParams = {
        tickLower: ticklow,
        tickUpper: tickhigh,
        liquidityDelta: liqDelta * BigInt(-1),
        salt: SALT
    };

    await modifyPosition(liqPool, modifyPositionParams, "0x00");
}

async function main(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = new Contract(CONTRACT_ADDRESSES.Token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.Token1, CONTRACTS['MockERC20Custom'].abi, wallet);
    const liqPool = new Contract(CONTRACT_ADDRESSES.LiquidPool, CONTRACTS['LiquidityPool'].abi, wallet);

    let poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.address} before removing liquidity is ${poolPrice}`);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before removing liquidity:", token0Before.toString());
    console.log("Token1 balance before removing liquidity:", token1Before.toString());

    const priceLower = 50;
    const priceUpper = 200;
    const amount0 = 500n * (10n ** 18n);
    const amount1 = 500n * (10n ** 18n);

    await removeLiq(wallet, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);

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
