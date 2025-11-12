import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY } from "../config";
import { isDeployed } from "../lib/utils";
import { mintERC20 } from "../lib/erc20";
import { DeterministicDeployFactory } from "../../typechain-types";

// Constants that correspond to the ones in Solidity
const FLAG_MASK = BigInt(0x3FFF);
const MAX_LOOP = 100_000;

// Define the extended flags
const ALL_HOOK_MASK = BigInt((1 << 14) - 1);
const BEFORE_INITIALIZE_FLAG = BigInt(1 << 13);
const AFTER_INITIALIZE_FLAG = BigInt(1 << 12);
const BEFORE_ADD_LIQUIDITY_FLAG = BigInt(1 << 11);
const AFTER_ADD_LIQUIDITY_FLAG = BigInt(1 << 10);
const BEFORE_REMOVE_LIQUIDITY_FLAG = BigInt(1 << 9);
const AFTER_REMOVE_LIQUIDITY_FLAG = BigInt(1 << 8);
const BEFORE_SWAP_FLAG = BigInt(1 << 7);
const AFTER_SWAP_FLAG = BigInt(1 << 6);
const BEFORE_DONATE_FLAG = BigInt(1 << 5);
const AFTER_DONATE_FLAG = BigInt(1 << 4);
const BEFORE_SWAP_RETURNS_DELTA_FLAG = BigInt(1 << 3);
const AFTER_SWAP_RETURNS_DELTA_FLAG = BigInt(1 << 2);
const AFTER_ADD_LIQUIDITY_RETURNS_DELTA_FLAG = BigInt(1 << 1);
const AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA_FLAG = BigInt(1 << 0);

// DeterministicDeployFactory 代表链上的Solidity合约，其利用Create2在固定位置部署合约
export async function deployCreate2(create2: DeterministicDeployFactory, contractName: string, types: string[], params: any[], saltHex: string) {
    // Load the contract artifact using TypeScript
    const scArtifact = CONTRACTS[contractName];
    const bytecode = scArtifact.bytecode.object;

    const initCode = bytecode + encoder(types, params);

    const create2Addr = create2Address(await create2.getAddress(), saltHex, initCode);
    console.log(`precomputed ${contractName} address: ${create2Addr}`);

    const tx = await create2.deploy(initCode, saltHex);
    await tx.wait();
    console.log(`deployed ${contractName} by ${tx.hash}`);

    return create2Addr; 
}

// Simulate the HookMiner.find function in TypeScript
async function findHookAddress(
    deployer: string,
    contractName: string, 
    types: string[], 
    params: any[],
    flags: BigInt
): Promise<{ hookAddress: string, salt: BigInt }> {
    // Load the contract artifact using TypeScript
    const scArtifact = CONTRACTS[contractName];
    const bytecode = scArtifact.bytecode.object;
    const creationCodeWithArgs = bytecode + encoder(types, params);
    // console.log("initCodeWithArgs", creationCodeWithArgs);

    let salt = BigInt(0);
    for (let i = 0; i < MAX_LOOP; i++) {
        const saltHex = ethers.id(salt.toString());
        const hookAddress = create2Address(deployer, saltHex, creationCodeWithArgs);
        if (hookAddress && (BigInt(hookAddress) & FLAG_MASK) === flags) {
            // Check if the address is not deployed
            const code = await ethers.provider.getCode(hookAddress);
            if (code === "0x") {
                return { hookAddress, salt };
            } else {
                throw new Error("HookMiner: address already used(deployed)");
            }
        }
        salt = salt + BigInt(1);
    }
    throw new Error("HookMiner: could not find salt");
}

export function create2Address(factoryAddress: string, saltHex: string, initCode: string): string {
    const create2Addr = ethers.getCreate2Address(factoryAddress, saltHex, ethers.keccak256(initCode));
    return create2Addr;
}

// Function to encode the parameters
export function encoder(types: string[], values: any[]): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(types, values);
    return encodedParams.slice(2);
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    // const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const wallet = await provider.getSigner();

    const factoryAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    if (!await isDeployed(provider, factoryAddr)) throw new Error("Factory is not deployed");
    const factory = await ethers.getContractAt("DeterministicDeployFactory", factoryAddr, wallet);
    // console.log("Factory address:", await factory.getAddress());

    const saltHex = ethers.id("0");

    // 1. Deploy ERC20 tokens
    let token0Addr = await deployCreate2(factory, "MockERC20Custom", ["string", "string", "uint256"], ["token0", "t0", 0], saltHex);
    let token1Addr = await deployCreate2(factory, "MockERC20Custom", ["string", "string", "uint256"], ["token1", "t1", 0], saltHex);
    if ( token0Addr > token1Addr ) {
        const temp = token0Addr;
        token0Addr = token1Addr;
        token1Addr = temp;
    }

    const token0 = new ethers.Contract(token0Addr, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new ethers.Contract(token1Addr, CONTRACTS['MockERC20Custom'].abi, wallet);
    mintERC20(token0, wallet.address, ethers.parseUnits("2100000", 18));
    mintERC20(token1, wallet.address, ethers.parseUnits("2100000", 18));

    // 2. Deploy poolManager.sol
    const controllerGasLimit = 1000000;
    const poolManagerAddr = await deployCreate2(factory, "PoolManager", ["uint256"], [controllerGasLimit], saltHex);
    
    // const poolManagerAddr = "0x194B734884739D76f06Aa2B88C28e79F79907776";

    // 3.1 Deploy DynamicFee Hook
    // const flags1 = AFTER_SWAP_FLAG | AFTER_INITIALIZE_FLAG;
    // const { hookAddress, salt } = await findHookAddress(factoryAddr, "DynamicFee", ["address"], [poolManagerAddr], flags1);
    // console.log("Hook address:", hookAddress);
    // console.log("Salt used:", salt.toString(), ethers.id(salt.toString())); 
    // await deployCreate2(factory, "DynamicFee", ["address"], [poolManagerAddr], ethers.id(salt.toString()));

    // 3.2 Deploy LimitOrder Hook
    const flags =  AFTER_INITIALIZE_FLAG | AFTER_SWAP_FLAG; // | AFTER_SWAP_RETURNS_DELTA_FLAG;
    const { hookAddress, salt } = await findHookAddress(factoryAddr, "LimitOrder", ["address"], [poolManagerAddr], flags);
    console.log("Hook address:", hookAddress);
    console.log("Salt used:", salt.toString(), ethers.id(salt.toString()));   
    
    // const salt = BigInt(1424); // 0x924caa65d1644bcda3c737cb4f972c9170b1e3eb26b1eeba5090c589a3beb7a4
    // const hookAddress = "0x87aa421F02e43b9Cb9C10b4Ebf3ADA61e13090c0";
    await deployCreate2(factory, "LimitOrder", ["address"], [poolManagerAddr], ethers.id(salt.toString()));

    // 4. Deploy liquidity
    let key = POOL_KEYS.limitOrderPoolKey;
    key.currency0 = token0Addr;
    key.currency1 = token1Addr;
    key.hooks = hookAddress;
    const liquidityPoolAddr = await deployCreate2(factory, "LiquidityPool", ["address", "(address,address,uint24,int24,address)"], [poolManagerAddr, Object.values(key)], saltHex);

    console.log("token0 = ", token0Addr);
    console.log("token1 = ", token1Addr);
    console.log("poolManager = ", poolManagerAddr);
    console.log("liquidityPool = ", liquidityPoolAddr);
    console.log("hookLimitOrder = ", hookAddress);
    console.log("Please update the CONTRACT_ADDRESSES in config.ts!");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
