import { ethers, Wallet } from "ethers";
// 显式加载 .env
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { RPC_URL, PRIVATE_KEY } from "../config/uniswap.config";
import { swap } from "../src/uniswap/1-marketprice/swap";
import { getPoolPrice, getPoolSqrtPrice } from "../src/uniswap/lib/pool";
import { getContract } from "../src/uniswap/lib/contract";
import { getERC20Balance } from "../src/uniswap/lib/ERC20";

async function main() {
    console.log("Connecting to RPC:", RPC_URL);
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");
    const liqPool = await getContract(wallet, "LiquidPool");

    console.log("--- 状态：Swap 之前 ---");
    const priceBefore = await getPoolPrice(liqPool);
    const sqrtPriceBefore = await getPoolSqrtPrice(liqPool);
    console.log(`池子价格 (Price): ${priceBefore}`);
    console.log(`池子 SqrtPrice: ${sqrtPriceBefore}`);

    const t0BalanceBefore = await getERC20Balance(token0, wallet.address);
    const t1BalanceBefore = await getERC20Balance(token1, wallet.address);
    console.log(`钱包 Token0 余额: ${ethers.utils.formatEther(t0BalanceBefore)}`);
    console.log(`钱包 Token1 余额: ${ethers.utils.formatEther(t1BalanceBefore)}`);

    // 我们交换一小部分代币，例如 10 个 Token0 换 Token1
    // zeroForOne = true -> swapping Token0 for Token1
    const swapAmount = ethers.utils.parseEther("10").toBigInt();
    const zeroForOne = true;
    
    // 如果没有特定的 hookData，传一个空的 bytes32 即可（根据 V4 的要求，具体看你的实现，如果你的 LimitOrder hook 要求必须带有 SALT_LIMITORDER，我们就传它）
    // 参考 swap.ts 中: utils.defaultAbiCoder.encode(["bytes32"], [SALT_LIMITORDER])
    // 但我们可以简单点传空 "0x" 或者用 swap.ts 中默认的方式。这里简单点传 "0x" 可能会被 hook 拦截，所以保险起见：
    const SALT_LIMITORDER = ethers.utils.keccak256("0x01"); 
    const hookData = ethers.utils.defaultAbiCoder.encode(["bytes32"], [SALT_LIMITORDER]);

    console.log(`\n执行 Swap: 数量 ${ethers.utils.formatEther(swapAmount)}, ZeroForOne(Token0->Token1): ${zeroForOne}...`);
    try {
        await swap(wallet, swapAmount, zeroForOne, hookData);
        console.log("Swap 成功！");
    } catch (e) {
        console.error("Swap 失败:", e);
        return;
    }

    console.log("\n--- 状态：Swap 之后 ---");
    const priceAfter = await getPoolPrice(liqPool);
    const sqrtPriceAfter = await getPoolSqrtPrice(liqPool);
    console.log(`池子价格 (Price): ${priceAfter}`);
    console.log(`池子 SqrtPrice: ${sqrtPriceAfter}`);
    
    const token0DiffPrice = ((priceAfter - priceBefore) / priceBefore) * 100;
    console.log(`价格变化比例: ${token0DiffPrice.toFixed(4)}%`);

    const t0BalanceAfter = await getERC20Balance(token0, wallet.address);
    const t1BalanceAfter = await getERC20Balance(token1, wallet.address);
    console.log(`钱包 Token0 余额: ${ethers.utils.formatEther(t0BalanceAfter)}`);
    console.log(`钱包 Token1 余额: ${ethers.utils.formatEther(t1BalanceAfter)}`);

    const diff0 = t0BalanceAfter - (t0BalanceBefore);
    const diff1 = t1BalanceAfter - (t1BalanceBefore);
    console.log(`Token0 变化量: ${ethers.utils.formatEther(diff0)}`);
    console.log(`Token1 变化量: ${ethers.utils.formatEther(diff1)}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
