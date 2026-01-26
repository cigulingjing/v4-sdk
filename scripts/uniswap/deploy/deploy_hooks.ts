import { ethers } from "hardhat";
import { deployHookWithFlags } from "./help";
import { CONTRACT_ADDRESSES } from "../config";

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

// Deploy DynamicFee hooks to pool manager
export async function deployDynamic(Create2Addr: string, poolManagerAddr:string) : Promise<string>{
    const factory=await ethers.getContractAt("Create2", Create2Addr);
    const factoryAddr=Create2Addr;

    const flagFee: bigint = AFTER_SWAP_FLAG | AFTER_INITIALIZE_FLAG;
    const dynamicFeeHook = await deployHookWithFlags(
        factory,
        factoryAddr,
        "DynamicFee",
        ["address"],
        [poolManagerAddr],
        flagFee
    );
    return dynamicFeeHook;
}


export async function deployLimitOrder(Create2Addr: string, poolManagerAddr:string) : Promise<string>{
    const factory=await ethers.getContractAt("Create2", Create2Addr);
    const factoryAddr=Create2Addr;

    // Deploy LimitOrder Hook
    const flagLimit: bigint = AFTER_INITIALIZE_FLAG | AFTER_SWAP_FLAG; // | AFTER_SWAP_RETURNS_DELTA_FLAG;
    const limitOrderHook = await deployHookWithFlags(
        factory,
        factoryAddr,
        "LimitOrder",
        ["address"],
        [poolManagerAddr],
        flagLimit
    );
    return limitOrderHook;
}
