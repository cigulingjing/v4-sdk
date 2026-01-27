import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, PRICE_INIT, INITIAL_SUPPLY } from "../../../config/uniswap.config";
import { priceToSqrtPrice } from "../lib/liqCalculation";
import { getERC20Balance, mintERC20 } from "../lib/ERC20";
import { getContract } from "../lib/wallet";
import { Wallet } from "ethers";

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

export async function ERC20Initial(wallet: Wallet, contractName: string, account:string, supply: bigint) {
    const token = await getContract(wallet, contractName);
    await mintERC20(token, account, supply);

    // 检查是否初始化成功
    const balance = await getERC20Balance(token,account)
    if (balance !== supply) {
        throw new Error(`${contractName} mint failed. Acount ${account} balance is ${balance}, expected ${supply}`);
    }
}

async function main() {
    // 1. PoolManager initial
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();
    // await initPoolManager(CONTRACT_ADDRESSES["PoolManager"]);

    // 2. ERC20 initial
    const supply = INITIAL_SUPPLY;
    await ERC20Initial(wallet,"Token0", walletAddress, supply);
    await ERC20Initial(wallet,"Token1", walletAddress, supply);
}

if (require.main === module) {
    main();
}