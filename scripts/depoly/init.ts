import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, PRICE_INIT } from "../config";
import { priceToSqrtPrice } from "../lib/liqCalculation";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    // await isDeployed("", CONTRACT_ADDRESSES.poolManager);
    // await getSlot0(poolManager, limitOrderPoolKey);

    const constract = new ethers.Contract(CONTRACT_ADDRESSES.poolManager, CONTRACTS["PoolManager"].abi, wallet);
    const price = PRICE_INIT; // token0/token1
    const hookData = "0x";

    const sqrtPriceX96 = priceToSqrtPrice(price); // 792281625142643375935439503360
    // console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
    await constract.initialize(POOL_KEYS.limitOrderPoolKey, sqrtPriceX96, hookData);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
