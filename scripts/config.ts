import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "../env" });

// ============================== Chain & Wallet Setup ======================================

export const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545/";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// ============================== Contract Addresses ========================================

export const CONTRACT_ADDRESSES = {
  Create2: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  Token0: "0x3e7B83B8bb8eE2D4d74ec805aeb1465e65E15E24",
  Token1: "0xF4DB8B5cC187B286Eb54Bf76c6b041286a46E4Ee",
  PoolManager: "0xDB0412DaB8210ccA6d9875eE0be7b580A3c12046",
  LiquidPool: "0xBFd16A06062060FA08EFca22e3b6d334EcF3E2f0",
  LimitOrder: "0x7982Cd1B4162c145e6c1a0f7fD3De4676950D040",
  DynamicFee: "0x541eEcD8E9A59476E436A766123B27330e149040"
};

// ============================== Contract ABIs ============================================

export const CONTRACTS: { [contractName: string]: any } = {
  PoolManager: require('../artifacts/@uniswap/v4-core/src/PoolManager.sol/PoolManager.json'),
  MockERC20: require('../artifacts/contracts/MockERC20.sol/MockERC20.json'),
  LiquidPool: require('../artifacts/contracts/LiquidPool.sol/LiquidPool.json'),
  LimitOrder: require('../artifacts/contracts/LimitOrder.sol/LimitOrder.json'),
  DynamicFee: require('../artifacts/contracts/DynamicFee.sol/DynamicFee.json'),
  Create2: require("../artifacts/contracts/Create2.sol/Create2.json"),
  Example: require('../artifacts/contracts/Example.sol/Example.json'),
};

// ============================== Pool Keys ================================================

const DYNAMIC_FEE_FLAG = 0x800000;

export const POOL_KEYS = {
  limitOrderPoolKey: {
    currency0: CONTRACT_ADDRESSES.Token0,
    currency1: CONTRACT_ADDRESSES.Token1,
    fee: 60,
    tickSpacing: 60,
    hooks: CONTRACT_ADDRESSES.LimitOrder,
  },
  dynamicFeePoolKey: {
    currency0: CONTRACT_ADDRESSES.Token0,
    currency1: CONTRACT_ADDRESSES.Token1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: CONTRACT_ADDRESSES.DynamicFee,
  },
};

export const SALT = ethers.utils.keccak256("0x00")
export const SALT_LIMITORDER = ethers.utils.keccak256("0x01")
export const PRICE_INIT = 1 // 1 token0 => PRICE_INIT token1
export const PRICE_LIMIT = 1.1


export const INITAIL_LIQUIDITY = ethers.utils.parseEther("1000").toBigInt();
export const INITAIL_SUPPLY = ethers.utils.parseEther("210000000").toBigInt();