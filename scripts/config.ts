import { keccak256 } from "ethers"; 
import * as dotenv from "dotenv";
dotenv.config({path: "../env"});

// ============================== Chain & Wallet Setup ======================================

export const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545/";
export const PRIVATE_KEY = process.env.PRIVATE_KEY || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// ============================== Contract Addresses ========================================

export const CONTRACT_ADDRESSES = {
  token0: "0x36772542E68Ff172b9c62870Ef1570F467DF8736",
  token1: "0xd9b3d09F662b3B5479a785AC6ABa5Dd17A132Dc3",
  poolManager: "0x5D81e90A6C670E12260AB165667efa4E535e4B8d",
  liquidityProvider: "0x9941eCab14bdf4F6c7A7d0B4C2E4Dd78C92Ce4eD",
  hook: "0x91D0363b1a5e0C871b2D914303F12Bd659B75040",
  hookFee: "",
};

// ============================== Contract ABIs ============================================

export const CONTRACTS: { [contractName: string]: any} = {
  PoolManager: require('../foundry-out/PoolManager.sol/PoolManager.json'),
  MockERC20Custom: require('../foundry-out/MockERC20Custom.sol/MockERC20Custom.json'),
  LiquidityPool: require('../foundry-out/LiquidityPool.sol/LiquidityPool.json'),
  LimitOrder: require('../foundry-out/LimitOrder.sol/LimitOrder.json'),
  DynamicFee: require('../foundry-out/DynamicFee.sol/DynamicFee.json'),
};

// ============================== Pool Keys ================================================

const DYNAMIC_FEE_FLAG = 0x800000;

export const POOL_KEYS = {
  limitOrderPoolKey: {
    currency0: CONTRACT_ADDRESSES.token0,
    currency1: CONTRACT_ADDRESSES.token1,
    fee: 60,
    tickSpacing: 60,
    hooks: CONTRACT_ADDRESSES.hook,
  },
  dynamicFeePoolKey: {
    currency0: CONTRACT_ADDRESSES.token0,
    currency1: CONTRACT_ADDRESSES.token1,
    fee: DYNAMIC_FEE_FLAG,
    tickSpacing: 60,
    hooks: CONTRACT_ADDRESSES.hookFee,
  },
};

export const SALT = keccak256("0x00")
export const SALT_LIMITORDER = keccak256("0x01")
export const PRICE_INIT = 100
export const PRICE_LIMIT = 101