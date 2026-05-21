import { ethers, Wallet } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { RPC_URL, PRIVATE_KEY, POOL_KEYS } from "../config/uniswap.config";
import { getUserPositions } from "../src/uniswap/1-marketprice/getPositions";
import { addLiq } from "../src/uniswap/1-marketprice/addLiquidity";

async function main() {
    console.log("Connecting to RPC:", RPC_URL);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const poolKey = POOL_KEYS.limitOrderPoolKey;
    const amount0 = ethers.utils.parseEther("5").toBigInt();
    const amount1 = ethers.utils.parseEther("5").toBigInt();
    
    // 一个不同的价格区间，看看会不会Mint出 tokenId: 2
    const priceLower2 = 2000;
    const priceUpper2 = 5000;
    
    console.log(`\n--- 添加新的区间流动性... (Lower: ${priceLower2}, Upper: ${priceUpper2}) ---`);
    try {
        const receipt = await addLiq(wallet, priceLower2, priceUpper2, amount0, amount1, poolKey);
        console.log("添加流动性成功, TX:", receipt.transactionHash);
    } catch (e) {
        console.error("添加流动性出错:", e);
    }

    console.log("\n--- 查询最新的所有持仓 ---");
    const positionsAfter = await getUserPositions(wallet);
    console.log("持仓数量:", positionsAfter.length);
    console.log(positionsAfter);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
