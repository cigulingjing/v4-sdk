import { config } from "./config/env.config";

console.log("=== 配置验证 ===\n");

console.log("ABI 根目录:", config.paths.abiRootDir);
console.log("\n完整 ABI 路径:");
console.log("- PoolManager:", config.abiPaths.uniswap.poolManager);
console.log("- MockERC20:", config.abiPaths.uniswap.mockERC20);
console.log("- ChainYVault:", config.abiPaths.auction.chainYVault);
console.log("- ChainXAuction:", config.abiPaths.auction.chainXAuction);

console.log("\n合约地址:");
console.log("- Token0:", config.contracts.uniswap.token0);
console.log("- PoolManager:", config.contracts.uniswap.poolManager);

console.log("\nPool 配置:");
console.log("- PRICE_INIT:", config.pool.priceInit);
console.log("- INITIAL_LIQUIDITY:", config.pool.initialLiquidity.toString());
