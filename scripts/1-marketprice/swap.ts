import { ethers } from "hardhat";
import type { Wallet } from "ethers";
import { CONTRACT_ADDRESSES, CONTRACTS, RPC_URL, PRIVATE_KEY, SALT, SALT_LIMITORDER } from "../config";
import { SwapParams } from "../lib/types";
import { getPoolPrice, getCurrentTick } from "../lib/pool";
import { getERC20Balance, isApproved, approveERC20 } from "../lib/ERC20";
import { executeSwap } from "../lib/swap";
import { priceToSqrtPrice ,calculateTickFromPriceWithSpacing} from "../lib/liqCalculation";
import { getContract } from "../lib/wallet";

// Swap function that handles token approval and execution
export async function swap(wallet: Wallet, amountIn: bigint, zeroForOne: boolean, hookData: string): Promise<void> {
    const token0=await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token0, wallet);
    const token1=await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token1, wallet);
    const liqPool=await ethers.getContractAt("LiquidPool",CONTRACT_ADDRESSES.LiquidPool, wallet);

    const priceCurrent = await getPoolPrice(liqPool);
    // slippage at 5%
    const slippageMultiplier = 105;
    const base = 100;

    // after zero for one, the price is decreased, the price0 is the maximum slippage
    const price0 = priceCurrent * base / slippageMultiplier;
    const price1 = priceCurrent * slippageMultiplier / base;
    const sqrtPricecur = priceToSqrtPrice(priceCurrent)
    const sqrtPrice0 = priceToSqrtPrice(price0)
    const sqrtPrice1 = priceToSqrtPrice(price1)
    // console.log(`sqrtPricecur: ${sqrtPricecur.toString()}, sqrtPrice0: ${sqrtPrice0.toString()}, sqrtPrice1: ${sqrtPrice1.toString()}`);

    const tick=await getCurrentTick(liqPool);
    console.log("Current tick at liquild pool:",tick);

    // If zero for one, the price cannot be less than this value after the swap. 
    // If one for zero, the price cannot be greater than this value after the swap
    const sqrtPriceLimitX96 = zeroForOne
        ? sqrtPrice0 
        : sqrtPrice1;

    const swapParams: SwapParams = {
        zeroForOne: zeroForOne, // Swap direction, if true, swap token0 for token1
        amountSpecified: amountIn,
        sqrtPriceLimitX96: sqrtPriceLimitX96 // Price limit after swap to protect against slippage
    };

    // Check and approve ERC20 tokens if necessary
    const token = zeroForOne ? token0 : token1;
    // Calculate an approval amount with a 1% buffer to account for fees
    if (!(await isApproved(token, wallet.address, liqPool.address, ethers.constants.MaxUint256.toBigInt()))) {
        await approveERC20(token, liqPool.address, ethers.constants.MaxUint256.toBigInt());
    }
    // Execute the swap
    await executeSwap(liqPool, swapParams, hookData);
}

// Main function to execute the swap and display results
export async function main(): Promise<void> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    const token0= await getContract(wallet,"Token0");
    const token1= await getContract(wallet,"Token1");
    const liqPool= await getContract(wallet,'LiquidPool');

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before swapping:", token0Before.toString());
    console.log("Token1 balance before swapping:", token1Before.toString());


    const swapAmount = ethers.utils.parseEther("1000").toBigInt(); 
    // False will make price higher, True will make price lower
    const zeroForOne = false;
    const x = zeroForOne? 0 : 1;
    console.log(`swap ${ethers.utils.formatEther(swapAmount)} amount of token${1-x} from token${x}`);

    // used for LimitOrder.sol afterSwap
    const hookData = ethers.utils.defaultAbiCoder.encode(["bytes32"], [SALT_LIMITORDER]);
    await swap(wallet, swapAmount, zeroForOne, hookData);

    const token0After:bigint = await getERC20Balance(token0, wallet.address);
    const token1After:bigint = await getERC20Balance(token1, wallet.address);
    const token0Diff = token0After - token0Before;
    const token1Diff = token1After - token1Before;
    console.log("Token0 change:", ethers.utils.formatEther(token0Diff));
    console.log("Token1 change:", ethers.utils.formatEther(token1Diff));
    
    if (token0Diff === BigInt(0) || token1Diff === BigInt(0) ){
        console.log("No tokens were swapped. Maybe liquidity is insufficient.");
        return;
    }else{
        const currentTick = await getCurrentTick(liqPool);
        console.log(`Current Tick After Swap: ${currentTick}` );
    }
}

// Run the main function
main().catch((error) => {
    console.error(error);
    process.exit(1);
});