import { Contract, Wallet, JsonRpcProvider } from "ethers";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, PRIVATE_KEY, RPC_URL, SALT_LIMITORDER, PRICE_LIMIT } from "../config";
import { calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { PoolKey } from "../lib/types";
import { getERC20Balance } from "../lib/erc20";
import { getPoolPrice } from "../lib/pool";

async function killLimitOrder(contract: Contract, poolKey: any, tickLower: number, zeroForOne: boolean, to: string): Promise<void> {
    const tx = await contract.kill(poolKey, tickLower, zeroForOne, to);
    await tx.wait();
    console.log("Kill successfully");

    return new Promise((resolve, reject) => {
        contract.once("Kill", (owner, epoch, key, tickLower, zeroForOne, liquidity) => {
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

async function killLimitOrderFrontend(token0: Contract, token1: Contract, priceLimit: number, poolkey: PoolKey, saltHex: string, wallet: Wallet){
    const liqPool = new Contract(CONTRACT_ADDRESSES.liquidityProvider, CONTRACTS['LiquidityPool'].abi, wallet);
    const hook = new Contract(CONTRACT_ADDRESSES.hook, CONTRACTS['LimitOrder'].abi, wallet);

    const priceCurrent = await getPoolPrice(liqPool);
    const tickcurr = calculateTickFromPriceWithSpacing(priceCurrent, poolkey.tickSpacing)
    const ticklow = calculateTickFromPriceWithSpacing(priceLimit, poolkey.tickSpacing)
    const tickhigh = ticklow + poolkey.tickSpacing;
    console.log(`tickcurr: ${tickcurr}, ticklower: ${ticklow}, tickhigh: ${tickhigh}`);

    let zeroForOne: boolean;
    if (tickcurr < ticklow) {
        zeroForOne = true;
    } else if (tickcurr > tickhigh) {
        zeroForOne = false; 
    } else {
        throw new Error("Price mismatch for limit order");
    }

    let tx = await hook.kill(poolkey, ticklow, zeroForOne, wallet.address, saltHex);
    await tx.wait();
    
    await hook.once("Kill", (owner, epoch, key, tickLower, zeroForOne, liquidity, event) => {
        console.log("Kill event emitted:");
        console.log(`Owner: ${owner}`);
        console.log(`Epoch: ${epoch.toString()}`);
        console.log(`Key: ${key}`);
        console.log(`TickLower: ${tickLower.toString()}`);
        console.log(`ZeroForOne: ${zeroForOne}`);
        console.log(`Liquidity: ${liquidity.toString()}`);
    
        // Handle event here
    });
}

async function main(): Promise<void> {
    const provider = new JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = new Contract(CONTRACT_ADDRESSES.token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.token1, CONTRACTS['MockERC20Custom'].abi, wallet);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before adding Limit order:", token0Before.toString());
    console.log("Token1 balance before adding limit order:", token1Before.toString());

    const price = PRICE_LIMIT;
    const epo = await killLimitOrderFrontend(token1, token0, price, POOL_KEYS.limitOrderPoolKey, SALT_LIMITORDER, wallet)
    console.log("epoch:", epo);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
