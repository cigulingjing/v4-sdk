import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESSES } from "../config";
import { isDeployed, bigintToBytes32,abiEncode } from "../lib/utils";
import { mintERC20 } from "../lib/erc20";
import { create2Deploy, deployHookWithFlags } from "./help";
import { deployMockERC20,ERC20Initial } from "./deploy_mockERC20";
import { deployHooks } from "./deploy_hooks";
import { initPoolManager } from "./deploy_poolmanager";
import {deployCreate2} from "./deploy_create2";

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    // 1. Deploy Create2 factory 
    const create2Address=await deployCreate2(wallet);
    if (!await isDeployed(provider, create2Address)) throw new Error("Factory is not deployed");
    const factory = await ethers.getContractAt("Create2", create2Address, wallet);
    // console.log("Factory address:", await factory.getAddress());

    const salt: bigint = BigInt(0);
    const initialSupply=ethers.utils.parseUnits("2100000", 18).toBigInt();

    // 1. Deploy ERC20 tokens
    let token0Addr=await deployMockERC20("bitcoin","btc",initialSupply);
    let token1Addr=await deployMockERC20("ethereum","eth",initialSupply);

    // ensure token0Addr < token1Addr, for poolmanager poolkey check
    if (token0Addr>token1Addr) {
        const temp=token0Addr;
        token0Addr=token1Addr;
        token1Addr=temp;
    }

    // 2. Deploy poolManager.sol
    const liquidityProvider = walletAddress;
    const poolManagerAddr = await create2Deploy(factory, "PoolManager", ["address"], [liquidityProvider], salt);

    // 3.1 Deploy DynamicFee Hook
    await deployHooks(create2Address,poolManagerAddr);

    // 4. Deploy liquidity
    let key = POOL_KEYS.limitOrderPoolKey;
    key.currency0 = token0Addr;
    key.currency1 = token1Addr;
    const liquidityPoolAddr = await create2Deploy(factory, "LiquidPool", ["address", "(address,address,uint24,int24,address)"], [poolManagerAddr, Object.values(key)], salt);
    

    // 5. Output deployed addresses
    console.log("---- Deployed Addresses ----");
    console.log("create2Factory = ", create2Address);
    console.log("token0 = ", token0Addr);
    console.log("token1 = ", token1Addr);
    console.log("poolManager = ", poolManagerAddr);
    console.log("liquidityPool = ", liquidityPoolAddr);
    console.log("Please update the CONTRACT_ADDRESSES in config.ts!");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});