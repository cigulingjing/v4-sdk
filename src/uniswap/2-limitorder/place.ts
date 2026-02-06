import type { Contract, Wallet } from "ethers";
import { CONTRACT_ADDRESSES, PRIVATE_KEY, RPC_URL, POOL_KEYS, SALT_LIMITORDER, PRICE_LIMIT } from "../../../config/uniswap.config";
import { getCurrentTick, getPoolPrice } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/ERC20";
import { calculateTickFromPriceWithSpacing, calculatePriceFromTick, getSqrtPriceAtTick, liquidity0, liquidity1, amount0 } from "../lib/liqCalculation";
import { PoolKey } from "../lib/types";
import { ethers } from "ethers";
import { getContract } from "../lib/contract";

async function placeLimitOrder(contract: Contract, poolKey: any, tickLower: number, zeroForOne: boolean, liquidity: BigInt): Promise<any> {
    const tx = await contract.place(poolKey, tickLower, zeroForOne, liquidity);
    await tx.wait();
    console.log("Limit order set successfully:");

    return new Promise((resolve, reject) => {
        contract.once("Place", (owner, epoch, key, tickLower, zeroForOne, liquidity) => {
            resolve({
                owner,
                epoch: epoch.toString(),
                key,
                tickLower: tickLower.toString(),
                zeroForOne,
                liquidity: liquidity.toString()
            });
        });
    });
}

async function placeLimitOrderFrontend(token0: Contract, token1: Contract, amountIn: bigint, priceLimit: number, poolKey: PoolKey, wallet: Wallet): Promise<any> {
    const ticklow = calculateTickFromPriceWithSpacing(priceLimit, poolKey.tickSpacing);
    const tickhigh = ticklow + poolKey.tickSpacing;

    const pricelow = calculatePriceFromTick(ticklow);
    const priceupp = calculatePriceFromTick(tickhigh);

    const sqrt_low = getSqrtPriceAtTick(ticklow);
    const sqrt_upp = getSqrtPriceAtTick(tickhigh);

    const liqPool = await getContract(wallet, "LiquidPool");
    const currentTick = await getCurrentTick(liqPool);
    const priceCurrent = await getPoolPrice(liqPool);

    console.log(`Current pool price: ${priceCurrent}, price low: ${pricelow}, price upp: ${priceupp}`);
    console.log(`Tick low: ${ticklow}, Tick high: ${tickhigh}, Current Tick: ${currentTick}`);

    let liquidity: bigint;
    let zeroForOne: boolean;
    if (ticklow > currentTick) {
        zeroForOne = true;
        liquidity = liquidity0(amountIn, sqrt_low, sqrt_upp);
        if (!(await isApproved(token0, wallet.address, CONTRACT_ADDRESSES.LimitOrder, amountIn))) {
            await approveERC20(token0, CONTRACT_ADDRESSES.LimitOrder, amountIn);
        }
    } else if (tickhigh <= currentTick) {
        zeroForOne = false;
        liquidity = liquidity1(amountIn, sqrt_upp, sqrt_low);
        if (!(await isApproved(token1, wallet.address, CONTRACT_ADDRESSES.LimitOrder, amountIn))) {
            await approveERC20(token1, CONTRACT_ADDRESSES.LimitOrder, amountIn);
        }
    } else {
        throw new Error("Price mismatch for limit order");
    }

    const hook = await getContract(wallet, "LimitOrder");
    const epoch = await placeLimitOrder(hook, poolKey, ticklow, zeroForOne, liquidity);
    return epoch;
}

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");

    const token0Before = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1Before = (await getERC20Balance(token1, wallet.address)).valueOf();

    const limitPrice = PRICE_LIMIT;
    const amountIn = ethers.utils.parseEther("1000").toBigInt();
    const epo = await placeLimitOrderFrontend(token0, token1, amountIn, limitPrice, POOL_KEYS.limitOrderPoolKey, wallet)
    console.log("epoch:", epo);

    const token0After = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1After = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
