import { Contract, Wallet, JsonRpcProvider } from "ethers";
import { CONTRACT_ADDRESSES, CONTRACTS, PRIVATE_KEY, RPC_URL, POOL_KEYS, SALT_LIMITORDER, PRICE_LIMIT } from "../config";
import { getPoolPrice } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/erc20";
import { calculateTickFromPriceWithSpacing, calculatePriceFromTick, getSqrtPriceAtTick, liquidity0, liquidity1, amount0 } from "../lib/liqCalculation";
import { PoolKey } from "../lib/types";

async function placeLimitOrder(contract: Contract, poolKey: any, tickLower: number, zeroForOne: boolean, liquidity: BigInt, saltHex: string): Promise<any> {
    const tx = await contract.place(poolKey, tickLower, zeroForOne, liquidity, saltHex);
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

async function placeLimitOrderFrontend(token0: Contract, token1: Contract, amountIn: BigInt, priceLimit: number, poolKey: PoolKey, saltHex: string, wallet: Wallet): Promise<any> {
    const ticklow = calculateTickFromPriceWithSpacing(priceLimit, poolKey.tickSpacing);
    const tickhigh = ticklow + poolKey.tickSpacing;
    const pricelow = calculatePriceFromTick(ticklow);
    const priceupp = calculatePriceFromTick(tickhigh);
    const sqrt_low = getSqrtPriceAtTick(ticklow);
    const sqrt_upp = getSqrtPriceAtTick(tickhigh);
    
    const liqPool = new Contract(CONTRACT_ADDRESSES.liquidityProvider, CONTRACTS['LiquidityPool'].abi, wallet);
    const priceCurrent = await getPoolPrice(liqPool);
    console.log(`Current pool price: ${priceCurrent}, price low: ${pricelow}, price upp: ${priceupp}`);

    let liquidity: BigInt;
    let zeroForOne: boolean;
    if (priceCurrent < pricelow) {
        zeroForOne = true;
        liquidity = liquidity0(amountIn, sqrt_low, sqrt_upp);
        const amt0 = amount0(liquidity, sqrt_low, sqrt_upp);
        // console.log("amt0:", amt0, amountIn);
        
        if (!(await isApproved(token0, wallet.address, CONTRACT_ADDRESSES.hook, amountIn))) {
            await approveERC20(token0, CONTRACT_ADDRESSES.hook, amountIn);
        }
    } else if (priceCurrent > priceupp) {
        zeroForOne = false;
        liquidity = liquidity1(amountIn, sqrt_upp, sqrt_low);

        if (!(await isApproved(token1, wallet.address, CONTRACT_ADDRESSES.hook, amountIn))) {
            await approveERC20(token1, CONTRACT_ADDRESSES.hook, amountIn);
        }
    } else {
        throw new Error("Price mismatch for limit order");
    }

    const hook = new Contract(CONTRACT_ADDRESSES.hook, CONTRACTS['LimitOrder'].abi, wallet);
    const epoch = await placeLimitOrder(hook, poolKey, ticklow, zeroForOne, liquidity, saltHex);
    // console.log("Order epoch:", epoch);
    return epoch;
}

async function main(){
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = new Contract(CONTRACT_ADDRESSES.token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.token1, CONTRACTS['MockERC20Custom'].abi, wallet);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before adding Limit order:", token0Before.toString());
    console.log("Token1 balance before adding limit order:", token1Before.toString());

    const limitPrice = PRICE_LIMIT;
    const amountIn = 20n * (10n ** 18n);
    const epo = await placeLimitOrderFrontend(token0, token1, amountIn, limitPrice, POOL_KEYS.limitOrderPoolKey, SALT_LIMITORDER, wallet)
    console.log("epoch:", epo);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
