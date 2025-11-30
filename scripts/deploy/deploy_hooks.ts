// 类型导入，再编译阶段进行类型检查，并不会生成运行时代码，确保ethers版本使用的是hardhat内置版本
import type { Contract, Signer } from "ethers";
import { ethers } from "hardhat";

import { RPC_URL, PRIVATE_KEY, CONTRACTS, CONTRACT_ADDRESSES, POOL_KEYS } from "../config";
import { deployHookWithFlags } from "./help";


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

// Deploy LimitOrder and DynamicFee hooks to pool manager
export async function deployHooks(Create2Addr: string, poolManagerAddr:string){
    const factory=await ethers.getContractAt("Create2", Create2Addr);
    const factoryAddr=Create2Addr;

     // 3.1 Deploy DynamicFee Hook
    const flagFee: bigint = AFTER_SWAP_FLAG | AFTER_INITIALIZE_FLAG;
    const dynamicFeeHook = await deployHookWithFlags(
        factory,
        factoryAddr,
        "DynamicFee",
        ["address"],
        [poolManagerAddr],
        flagFee
    );

    // 3.2 Deploy LimitOrder Hook
    const flagLimit: bigint = AFTER_INITIALIZE_FLAG | AFTER_SWAP_FLAG; // | AFTER_SWAP_RETURNS_DELTA_FLAG;
    const limitOrderHook = await deployHookWithFlags(
        factory,
        factoryAddr,
        "LimitOrder",
        ["address"],
        [poolManagerAddr],
        flagLimit
    );
}