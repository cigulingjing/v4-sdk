// 从集中的配置解析器导入所有配置
import {
  config,
  RPC_URL,
  PRIVATE_KEY,
  CONTRACT_ADDRESSES,
  SALT,
  SALT_LIMITORDER,
  PRICE_INIT,
  PRICE_LIMIT,
  INITIAL_LIQUIDITY,
  INITIAL_SUPPLY,
  DYNAMIC_FEE_FLAG,
} from "../../config/env.config";

// ============================== 导出配置供其他模块使用 ======================================

// 导出 RPC 和钱包配置
export { RPC_URL, PRIVATE_KEY };

// 导出合约地址
export { CONTRACT_ADDRESSES };

// 导出 Pool 配置常量
export { SALT, SALT_LIMITORDER, PRICE_INIT, PRICE_LIMIT, INITIAL_LIQUIDITY, INITIAL_SUPPLY };

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