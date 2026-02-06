// 从集中的配置解析器导入所有配置
import {
  config,
  RPC_URL,
  PRIVATE_KEY,
} from "./env.config";
import {join} from "path";



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
function relativePath(filepath:string):string{
  const ROOT = '..';
  return join(ROOT,filepath)
}
// Uniswap ABI 路径
const ABI_PATHS = config.abiPaths.uniswap;

const CONTRACTS_ABI={
  PoolManager: require(relativePath(ABI_PATHS.poolManager)),
  MockERC20: require(relativePath(ABI_PATHS.mockERC20)),
  LiquidPool: require(relativePath(ABI_PATHS.liquidPool)),
  LimitOrder: require(relativePath(ABI_PATHS.limitOrder)),
  DynamicFee: require(relativePath(ABI_PATHS.dynamicFee)),
  Create2: require(relativePath(ABI_PATHS.create2)),
  Example: require(relativePath(ABI_PATHS.example)),
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


if (require.main === module) {
  console.log("=== Uniswap 配置验证 ===\n");

  console.log("ABI 路径:");
  console.log("- PoolManager:", ABI_PATHS.poolManager);
  console.log("- MockERC20:", ABI_PATHS.mockERC20);
  console.log("- LiquidPool:", ABI_PATHS.liquidPool);
  console.log("- LimitOrder:", ABI_PATHS.limitOrder);
  console.log("- DynamicFee:", ABI_PATHS.dynamicFee);
  console.log("- Create2:", ABI_PATHS.create2);
  console.log("- Example:", ABI_PATHS.example);

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