import {
  RPC_URL,
  PRIVATE_KEY,
  config,
} from "./env.config";
import {join} from "path";

const chainXAuctionV2Addr=config.contracts.auction.chainXAuctionV2;
const chainYVaultV2Addr=config.contracts.auction.chainYVaultV2;
const coinbaseAddr=config.contracts.auction.coinbase;

const AUCTION_ADDR={
  chainXAuction:chainXAuctionV2Addr,
  chainYVault:chainYVaultV2Addr,
  coinbase:coinbaseAddr,
}

// ABI路径
const ABI_PATHS = config.abiPaths.auction;
function relativePath(filepath:string):string{
  const ROOT = '..';
  return join(ROOT,filepath)
}

const AUCTION_ABI = {
  coinbase: require(relativePath(ABI_PATHS.coinbase)),
  chainXAuction: require(relativePath(ABI_PATHS.chainXAuction)),
  chainYVault: require(relativePath(ABI_PATHS.chainYVault)),
} as const;

export { RPC_URL, PRIVATE_KEY };
export { AUCTION_ADDR,AUCTION_ABI};

if (require.main === module) {
    console.log("=== Auction 配置验证 ===\n");
    console.log("合约地址:");
    console.log("ChainYVaultV2:", chainYVaultV2Addr);
    console.log("ChainXAuctionV2:", chainXAuctionV2Addr);   
    console.log("Coinbase:", coinbaseAddr); 
}