import { Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, PRIVATE_KEY, RPC_URL, SALT_LIMITORDER, PRICE_LIMIT } from "../config";
import { calculateTickFromPriceWithSpacing } from "../lib/liqCalculation";
import { PoolKey } from "../lib/types";
import { getERC20Balance } from "../lib/erc20";
import { getPoolPrice } from "../lib/pool";
import { getContract } from "../lib/wallet";

async function killLimitOrderFrontend(sender: string, priceLimit: number, poolkey: PoolKey, wallet: Wallet){
    const liqPool = await getContract(wallet, "LiquidPool");
    const limitHook=await getContract(wallet, "LimitOrder");

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

    let tx = await limitHook.kill(poolkey, ticklow, zeroForOne, wallet.address);
    await tx.wait();
    
    await limitHook.once("Kill", (owner, epoch, key, tickLower, zeroForOne, liquidity, event) => {
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
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0=await getContract(wallet,"Token0");
    const token1=await getContract(wallet,"Token1");

    const token0Before = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1Before = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 balance before adding Limit order:", token0Before.toString());
    console.log("Token1 balance before adding limit order:", token1Before.toString());

    const price = PRICE_LIMIT;
    const epo = await killLimitOrderFrontend(wallet.address, price, POOL_KEYS.limitOrderPoolKey, wallet)
    console.log("epoch:", epo);

    const token0After = (await getERC20Balance(token0, wallet.address)).valueOf();
    const token1After = (await getERC20Balance(token1, wallet.address)).valueOf();
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
