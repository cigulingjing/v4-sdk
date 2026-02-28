// 从集中的配置解析器导入所有配置
import {
  config,
  RPC_URL,
  PRIVATE_KEY,
} from "./env.config";
import PoolManagerABI from "../artifacts/@uniswap/v4-core/src/PoolManager.sol/PoolManager.json";
import MockERC20ABI from "../artifacts/contracts/uniswap/MockERC20.sol/MockERC20.json";
import LiquidPoolABI from "../artifacts/contracts/uniswap/LiquidPool.sol/LiquidPool.json";
import LimitOrderABI from "../artifacts/contracts/uniswap/LimitOrder.sol/LimitOrder.json";
import DynamicFeeABI from "../artifacts/contracts/uniswap/DynamicFee.sol/DynamicFee.json";
import Create2ABI from "../artifacts/contracts/uniswap/Create2.sol/Create2.json";
import ExampleABI from "../artifacts/contracts/uniswap/Example.sol/Example.json";



// ============================== 导出配置供其他模块使用 ======================================
export { RPC_URL, PRIVATE_KEY };
export { CONTRACT_ADDRESSES,CONTRACTS_ABI,POOL_KEYS};
export { SALT, SALT_LIMITORDER, PRICE_INIT, PRICE_LIMIT, INITIAL_LIQUIDITY, INITIAL_SUPPLY };



// ============================== Contract Address ============================================
const CONTRACT_ADDRESSES = {
    Create2: config.contracts.uniswap.create2,
    Token0: config.contracts.uniswap.token0,
    Token1: config.contracts.uniswap.token1,
    PoolManager: config.contracts.uniswap.poolManager,
    LiquidPool: config.contracts.uniswap.liquidPool,
    LimitOrder: config.contracts.uniswap.limitOrder,
    DynamicFee: config.contracts.uniswap.dynamicFee,
};

// ============================== Contract ABIs ============================================

const CONTRACTS_ABI={
  PoolManager: PoolManagerABI,
  MockERC20: MockERC20ABI,
  LiquidPool: LiquidPoolABI,
  LimitOrder: LimitOrderABI,
  DynamicFee: DynamicFeeABI,
  Create2: Create2ABI,
  Example: ExampleABI,
}

// ============================== Pool Keys ================================================
// Pool 配置
const SALT = config.pool.salt;
const SALT_LIMITORDER = config.pool.saltLimitOrder;
const PRICE_INIT = config.pool.priceInit;
const PRICE_LIMIT = config.pool.priceLimit;
const INITIAL_LIQUIDITY = config.pool.initialLiquidity;
const INITIAL_SUPPLY = config.pool.initialSupply;
const DYNAMIC_FEE_FLAG = config.pool.dynamicFeeFlag;


const POOL_KEYS = {
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


if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  console.log("=== Uniswap 配置验证 ===\n");

  console.log("\n合约地址:");
  console.log("- Token0:", CONTRACT_ADDRESSES.Token0);
  console.log("- Token1:", CONTRACT_ADDRESSES.Token1);
  console.log("- PoolManager:", CONTRACT_ADDRESSES.PoolManager);
  console.log("- LiquidPool:", CONTRACT_ADDRESSES.LiquidPool);
  console.log("- LimitOrder:", CONTRACT_ADDRESSES.LimitOrder);
  console.log("- DynamicFee:", CONTRACT_ADDRESSES.DynamicFee);
  console.log("- Create2:", CONTRACT_ADDRESSES.Create2);

  console.log("\nPool 配置:");
  console.log("- SALT:", SALT.toString());
  console.log("- SALT_LIMITORDER:", SALT_LIMITORDER.toString());
  console.log("- PRICE_INIT:", PRICE_INIT);
  console.log("- PRICE_LIMIT:", PRICE_LIMIT);
  console.log("- INITIAL_LIQUIDITY:", INITIAL_LIQUIDITY.toString());
  console.log("- INITIAL_SUPPLY:", INITIAL_SUPPLY.toString());
  console.log("- DYNAMIC_FEE_FLAG:", DYNAMIC_FEE_FLAG.toString(16));

  console.log("poolKeys:", POOL_KEYS);
}