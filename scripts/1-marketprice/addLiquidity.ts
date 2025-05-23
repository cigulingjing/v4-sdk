import { Contract, Wallet, JsonRpcProvider } from "ethers";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, SALT } from "../config";
import { ModifyPositionParams, PoolKey } from "../lib/types";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/erc20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";

async function addLiq(wallet: Wallet, priceLower: number, priceUpper: number, amount0: BigInt, amount1: BigInt, poolKey: PoolKey): Promise<void> {
    const token0 = new Contract(CONTRACT_ADDRESSES.token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.token1, CONTRACTS['MockERC20Custom'].abi, wallet);
    const liqPool = new Contract(CONTRACT_ADDRESSES.liquidityProvider, CONTRACTS['LiquidityPool'].abi, wallet);

    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing);
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);
    const sqrtCurrent = await getPoolSqrtPrice(liqPool);
    const [liqDelta, amount0Add, amount1Add] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0, amount1);
    console.log(`Attempting to add liquidity ${liqDelta} to price range [${priceLower}, ${priceUpper}] with amount0&1 [${amount0Add.toString()}, ${amount1Add.toString()}]`);

    let modifyPositionParams: ModifyPositionParams = {
        tickLower: ticklow,
        tickUpper: tickhigh,
        liquidityDelta: liqDelta,
        salt: SALT
    };
    console.log("Modify position params:", modifyPositionParams);

    // Check ERC20 token balances and approve if necessary
    const liqPoolAddr = await liqPool.getAddress();
    if (!(await isApproved(token0, wallet.address, liqPoolAddr, amount0Add))) {
        await approveERC20(token0, liqPoolAddr, amount0Add);
    }

    if (!(await isApproved(token1, wallet.address, liqPoolAddr, amount1Add))) {
        await approveERC20(token1, liqPoolAddr, amount1Add);
    }

    await modifyPosition(liqPool, modifyPositionParams, "0x00");
}

async function main(): Promise<void> {
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = new Contract(CONTRACT_ADDRESSES.token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.token1, CONTRACTS['MockERC20Custom'].abi, wallet);
    const liqPool = new Contract(CONTRACT_ADDRESSES.liquidityProvider, CONTRACTS['LiquidityPool'].abi, wallet);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before adding liquidity:", token0Before.toString());
    console.log("Token1 balance before adding liquidity:", token1Before.toString());

    let poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.target} before adding liquidity is ${poolPrice}`);

    const priceLower = 50;
    const priceUpper = 200;
    const amount0 = 10000n * (10n ** 18n);
    const amount1 = 10000n * (10n ** 18n);
    await addLiq(wallet, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);

    poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool ${liqPool.address} after adding liquidity is ${poolPrice} (Adding liquidity does not impact the asset price).`);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
