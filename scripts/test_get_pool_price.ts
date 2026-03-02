import { ethers, Wallet } from "ethers";
// 显式加载 .env，因为 SDK 内部为了浏览器兼容性不再自动加载
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { config, RPC_URL, PRIVATE_KEY } from "../config/env.config";
import { getPoolPrice, getPoolSqrtPrice } from "../src/uniswap/lib/pool";

async function main() {
    console.log("Connecting to RPC:", RPC_URL);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    // Get LiquidPool contract address from config
    const liquidPoolAddress = config.contracts.uniswap.liquidPool;
    console.log("LiquidPool Address:", liquidPoolAddress);

    // Create contract instance
    // We need the ABI. We can import it or just use a minimal ABI for getSlot0
    // Since getPoolPrice calls getSlot0, let's look at getSlot0 in pool.ts. 
    // It calls contract.getSlot0().
    

    // Use the compiled ABI from artifacts to ensure correctness
    const liquidPoolArtifact = require("../artifacts/contracts/uniswap/LiquidPool.sol/LiquidPool.json");
    const abi = liquidPoolArtifact.abi;

    const liquidPoolContract = new ethers.Contract(liquidPoolAddress, abi, wallet);

    try {
        console.log("Fetching pool price...");
        const price = await getPoolPrice(liquidPoolContract);
        const sqrtPrice = await getPoolSqrtPrice(liquidPoolContract);
        console.log("Successfully fetched pool price:", price);
        console.log("Successfully fetched pool sqrt price:", sqrtPrice);
    } catch (error) {
        console.error("Error fetching pool price:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
