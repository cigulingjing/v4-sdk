import { Contract, Wallet, providers } from "ethers";
import { CONTRACT_ADDRESSES, POOL_KEYS, RPC_URL, PRIVATE_KEY, SALT } from "../../../config/uniswap.config";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/ERC20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { ModifyPositionParams, PoolKey } from "../lib/types";
import { getContract } from "../lib/contract";

/**
 * Removes liquidity by directly specifying exact tick ranges and the liquidity delta to remove.
 * This is primarily used when matching with the frontend's position data.
 */
export async function removeLiqByPosition(wallet: Wallet, tickLower: number, tickUpper: number, liquidityToRemove: bigint | string): Promise<providers.TransactionReceipt> {
    const liqPool = await getContract(wallet, "LiquidPool");
    
    // Ensure liquidity is a positive BigInt before negating
    let liqDelta = BigInt(liquidityToRemove.toString());
    if (liqDelta > 0n) {
        liqDelta = liqDelta * -1n;
    }

    console.log(`[SDK] Attempting to remove liquidity ${liqDelta} from ticks [${tickLower}, ${tickUpper}]`);

    const modifyPositionParams: ModifyPositionParams = {
        tickLower: tickLower,
        tickUpper: tickUpper,
        liquidityDelta: liqDelta,
    };
    
    // Sending the transaction to the LiquidPool contract
    const receipt = await modifyPosition(liqPool, modifyPositionParams, "0x00");
    return receipt;
}

/**
 * Legacy support: calculate liquidity to remove via token amount projections.
 */
export async function removeLiq(wallet: Wallet, priceLower: number, priceUpper: number, amount0: bigint, amount1: bigint, poolKey: PoolKey): Promise<providers.TransactionReceipt> {
    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing);
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);
    const liqPool = await getContract(wallet, "LiquidPool");

    const sqrtCurrent = await getPoolSqrtPrice(liqPool);
    const [liqDelta, amount0Rmv, amount1Rmv] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0, amount1);
    console.log(`Attempting to remove liquidity ${liqDelta} to price range [${priceLower}, ${priceUpper}] with amount0[${amount0Rmv.toString()}], amount1[${amount1Rmv.toString()}]`);
    const modifyPositionParams: ModifyPositionParams = {
        tickLower: ticklow,
        tickUpper: tickhigh,
        liquidityDelta: liqDelta * -1n,
    };
    const receipt = await modifyPosition(liqPool, modifyPositionParams, "0x00");
    return receipt;
}

async function main(): Promise<void> {
    const provider = new providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const liqPoolAddress = CONTRACT_ADDRESSES.LiquidPool;

    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");
    const liqPool = await getContract(wallet, "LiquidPool");


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

    await removeLiq(wallet, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);

    poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.address} after removing liquidity is ${poolPrice}`);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
