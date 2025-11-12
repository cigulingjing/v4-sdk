// 类型导入，再编译阶段进行类型检查，并不会生成运行时代码，确保ethers版本使用的是hardhat内置版本
import type { Contract, Signer } from "ethers";
import { ethers } from "hardhat";

import { RPC_URL, PRIVATE_KEY, CONTRACTS, CONTRACT_ADDRESSES, POOL_KEYS } from "../config";
import { getERC20Balance } from "../lib/erc20";


export async function deployContract(contractName: string, params?: any, wallet?: Signer): Promise<Contract> {
    // const Factory = await ethers.getContractFactory(contractName, wallet);
    const contractArtifact = CONTRACTS[contractName];
    const Factory = new ethers.ContractFactory(contractArtifact.abi, contractArtifact.bytecode, wallet);

    const contract = await Factory.deploy(...params);
    await contract.waitForDeployment();
    // console.log(`${contractName} deployed to: ${contract.address}`);
    return contract as unknown as Contract;
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    // const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const wallet = await provider.getSigner();

    // Deploy ERC20 tokens
    let token0 = await deployContract("MockERC20Custom", ["token0", "t0", ethers.parseUnits("2100000", 18)], wallet);
    let token1 = await deployContract("MockERC20Custom", ["token1", "t1", ethers.parseUnits("2100000", 18)], wallet);
    if (token0.target > token1.target) {
        const temp = token0;
        token0 = token1;
        token1 = temp;
    }

    // Deploy other contracts
    const controllerGasLimit = 1000000;
    const poolManager = await deployContract("PoolManager", [controllerGasLimit], wallet);

    // The comment out deployment use deploy2.ts instead
    const hook = await deployContract("LimitOrder", [poolManager.target], wallet);
    // const hookFee = await deployContract("DynamicFee", [poolManager.address], wallet);
    
    let key = POOL_KEYS.limitOrderPoolKey;
    key.currency0 = await token0.getAddress();
    key.currency1 = await token1.getAddress();
    key.hooks = "0x0000000000000000000000000000000000000000"; // await hook.getAddress();
    const liquidityPool = await deployContract("LiquidityPool", [poolManager.target, key], wallet);

    // Output deployed contract addresses
    console.log("token0 = ", token0.target);
    console.log("token1 = ", token1.target);
    console.log("poolManager = ", poolManager.target);
    console.log("liquidityPool = ", liquidityPool.target);
    console.log("hookLimitOrder = ", hook.target);
    // console.log("hookDynamicFee = ", hookFee.target);
    console.log("Please update the CONTRACT_ADDRESSES in config.ts!");

    // Check balances
    const balance0 = await getERC20Balance(token0, wallet.address);
    const balance1 = await getERC20Balance(token1, wallet.address);
    console.log(`Token0 balance: ${balance0.toString()}, Token1 balance: ${balance1.toString()}`)
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
