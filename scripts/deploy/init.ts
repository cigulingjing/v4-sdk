import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, PRICE_INIT } from "../config";
import { priceToSqrtPrice } from "../lib/liqCalculation";
import { mintERC20 } from "../lib/erc20";

// InitPoolManager must be called only token is deployed.
export async function initPoolManager(contractAddress: string) {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const constract = new ethers.Contract(contractAddress, CONTRACTS["PoolManager"].abi, wallet);
    const price = PRICE_INIT
    const sqrtPriceX96 = priceToSqrtPrice(price); 
    // console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
    await constract.initialize(POOL_KEYS.limitOrderPoolKey, sqrtPriceX96);
    await constract.initialize(POOL_KEYS.dynamicFeePoolKey, sqrtPriceX96);
}

export async function ERC20Initial(tokenAddress:string, walletAddress:string, supply:bigint) {
    const token=await ethers.getContractAt("MockERC20",tokenAddress);
    mintERC20(token,walletAddress,supply);
}


async function main(){
    // 1. PoolManager initial
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress=await wallet.getAddress();
    await initPoolManager(CONTRACT_ADDRESSES["PoolManager"]);

    // 2. ERC20 initial
    const supply=ethers.utils.parseUnits("210000",18).toBigInt();
    await ERC20Initial(CONTRACT_ADDRESSES["Token0"],walletAddress,supply);
    await ERC20Initial(CONTRACT_ADDRESSES["Token1"],walletAddress,supply);
}
main();