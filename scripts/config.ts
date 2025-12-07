import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "../env" });

// ============================== Chain & Wallet Setup ======================================

export const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545/";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// ============================== Contract Addresses ========================================

export const CONTRACT_ADDRESSES = {
  Create2: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  Token0: "0x6F282A9aB802c906c61dbE6848F8a8464A1308F7",
  Token1: "0x8d7F2Bc6785CC4Cc2447551f5702E0E594636c9A",
  PoolManager: "0xDB0412DaB8210ccA6d9875eE0be7b580A3c12046",
  LiquidPool: "0xf48fA4e095913E6e9b733993E2642Aa4535123fB",
  LimitOrder: "0x1Fe235e4bc0542B221A6b8E2e55a86d28A8bd040",
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
export const PRICE_INIT = 100
export const PRICE_LIMIT = 101