import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, PRICE_INIT } from "../config";
import { priceToSqrtPrice } from "../lib/liqCalculation";
import { create2Deploy } from "./help";

async function deployDemo() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    // 1. Deploy normally
    // const ContractFactory = await ethers.getContractFactory("PoolManager", wallet);
    // const poolManager = await ContractFactory.deploy(ethers.constants.AddressZero);
    // await poolManager.deployed();
    // console.log(`PoolManager deployed to: ${poolManager.address}`);
    
    // 2. Deploy with create2
    const Create2Contract=await ethers.getContractAt("Create2", CONTRACT_ADDRESSES.Create2, wallet);

    let poolManagerAddr =await create2Deploy(Create2Contract,"PoolManager",["address"],[ethers.constants.AddressZero],BigInt(12345));
    console.log(`PoolManager deployed to: ${poolManagerAddr} by ${walletAddress}`);
}


// InitPoolManager must be called only token is deployed.
export async function initPoolManager(contractAddress: string) {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const constract = new ethers.Contract(contractAddress, CONTRACTS["PoolManager"].abi, wallet);
    const price = PRICE_INIT
    const sqrtPriceX96 = priceToSqrtPrice(price); 
    // console.log(`sqrtPriceX96: ${sqrtPriceX96}`);
    await constract.initialize(POOL_KEYS.limitOrderPoolKey, sqrtPriceX96);
}

initPoolManager(CONTRACT_ADDRESSES["PoolManager"]);