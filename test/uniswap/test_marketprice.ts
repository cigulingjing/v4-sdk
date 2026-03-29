
import { ethers } from "ethers";
import { getContract } from "../../src/uniswap/lib/contract";
import { getPoolPrice, getPoolSqrtPrice, getCurrentTick } from "../../src/uniswap/lib/pool";
import { RPC_URL, PRIVATE_KEY } from "../../config/uniswap.config";
import * as path from 'path';

// Monkey patch require to fix the relative path resolution issue in config
const originalRequire = require;
const projectRoot = __dirname;

// We need to override the require in the config file context, but since we can't easily do that
// we will rely on the fact that we are running this script with ts-node from the project root.
// The issue is likely in how `uniswap.config.ts` resolves paths when imported from `test_marketprice.ts`.

async function testMarketPrice() {
    console.log("Starting Market Price Test...");
    console.log(`Connecting to RPC: ${RPC_URL}`);

    try {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        console.log(`Wallet address: ${wallet.address}`);

        // Get contract instance
        console.log("Getting LiquidPool contract...");
        const liqPool = await getContract(wallet, "LiquidPool");
        console.log(`LiquidPool Address: ${liqPool.address}`);
        // Ensure liqPool has an abi
        if(!liqPool.interface) {
             console.error("❌ LiquidPool contract has no interface. ABI loading failed.");
             process.exit(1);
        }

        // Test 1: Get Slot0 data (indirectly via helper functions)
        console.log("\n--- Test 1: Fetching Pool Data ---");
        
        try {
            const sqrtPriceX96 = await getPoolSqrtPrice(liqPool);
            console.log(`✅ SqrtPriceX96: ${sqrtPriceX96.toString()}`);
        } catch (e: any) {
            console.error("❌ Failed to get SqrtPriceX96:", e.message);
        }

        try {
            const currentTick = await getCurrentTick(liqPool);
            console.log(`✅ Current Tick: ${currentTick}`);
        } catch (e: any) {
            console.error("❌ Failed to get Current Tick:", e.message);
        }

        try {
            const price = await getPoolPrice(liqPool);
            console.log(`✅ Calculated Price: ${price}`);
        } catch (e: any) {
            console.error("❌ Failed to get Price:", e.message);
        }

    } catch (error: any) {
        console.error("\n❌ Global Error during test:", error);
        if (error.code === 'NETWORK_ERROR') {
             console.error("Network connection failed. Please check your RPC_URL.");
        }
    }
}

testMarketPrice()
    .then(() => process.exit(0))
    .catch((error) => { // This catch block handles errors thrown from testMarketPrice that were not caught inside function
        console.error("Fatal Error:", error);
        process.exit(1);
    });
