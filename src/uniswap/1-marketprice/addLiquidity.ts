import { ethers, Wallet, Contract } from "ethers";

import { CONTRACT_ADDRESSES, POOL_KEYS, RPC_URL, PRIVATE_KEY, INITIAL_LIQUIDITY } from "../../../config/uniswap.config";
import { ModifyPositionParams, PoolKey } from "../lib/types";
import { getPoolPrice, getPoolSqrtPrice, modifyPosition } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/ERC20";
import { calculateLiqDelta, calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { getContract } from "../lib/contract";


export async function addLiq(wallet: Wallet, priceLower: number, priceUpper: number, amount0: bigint | number, amount1: bigint | number, poolKey: PoolKey): Promise<void> {
    // 合约对象实例化
    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");
    const liqPool = await getContract(wallet, "LiquidPool");

    const amount0Big = BigInt(amount0);
    const amount1Big = BigInt(amount1);

    console.log(`[SDK] Validating network and wallet...`);
    if (wallet.provider) {
        const net = await wallet.provider.getNetwork();
        console.log(`[SDK] Wallet connected to chainId: ${net.chainId}`);
    } else {
        console.warn(`[SDK] Wallet has no provider attached!`);
    }

    const ticklow = calculateTickFromPriceWithSpacing(priceLower, poolKey.tickSpacing); 
    const tickhigh = calculateTickFromPriceWithSpacing(priceUpper, poolKey.tickSpacing);

    let sqrtCurrent: bigint;
    try {
        console.log(`[SDK] Fetching sqrtPrice from LiquidPool (${liqPool.address})...`);
        // Force a call verification
        sqrtCurrent = await getPoolSqrtPrice(liqPool);
        console.log(`[SDK] SqrtPrice fetched: ${sqrtCurrent}`);
    } catch (e) {
        console.error(`[SDK] Failed to fetch sqrtPrice. Attempting diagnosis...`);
        // Check if code exists (again, but verbose)
        const code = await wallet.provider.getCode(liqPool.address);
        console.log(`[SDK] Code length at ${liqPool.address}: ${code.length}`);
        
        throw e;
    }

    const [liqDelta, amount0Add, amount1Add] = calculateLiqDelta(ticklow, sqrtCurrent, tickhigh, amount0Big, amount1Big);

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
    const tokenContractName = "MockERC20";
    const liqPoolAddress = CONTRACT_ADDRESSES.LiquidPool;

    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");
    const liqPool = await getContract(wallet, "LiquidPool");

    const token0Before = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1Before = (await getERC20Balance(token1, wallet.address)).valueOf();
    let poolPrice = await getPoolPrice(liqPool);
    console.log(`Current price of pool before adding liquidity is ${poolPrice}`);

    // 如果价格比当前区间最大值还要大，则只会添加token1。比当前价格区间还要小，则只会添加token0
    const priceLower = 0.5;
    const priceUpper = 1.5;
    const amount0 = INITIAL_LIQUIDITY;
    const amount1 = INITIAL_LIQUIDITY;
    await addLiq(wallet, priceLower, priceUpper, amount0, amount1, POOL_KEYS.limitOrderPoolKey);


    const token0After = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1After = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
