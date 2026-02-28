import {
  RPC_URL,
  PRIVATE_KEY,
  config,
} from "./env.config";
import CoinbaseABI from "../artifacts/contracts/auction/coinbase-and-stake/coinbase.sol/Coinbase.json";
import ChainXAuctionV2ABI from "../artifacts/contracts/auction/ChainXAuctionV2.sol/ChainXAuctionV2.json";
import ChainYVaultV2ABI from "../artifacts/contracts/auction/ChainYVaultV2.sol/ChainYVaultV2.json";

const chainXAuctionV2Addr=config.contracts.auction.chainXAuctionV2;
const chainYVaultV2Addr=config.contracts.auction.chainYVaultV2;
const coinbaseAddr=config.contracts.auction.coinbase;

const AUCTION_ADDR={
  chainXAuction:chainXAuctionV2Addr,
  chainYVault:chainYVaultV2Addr,
  coinbase:coinbaseAddr,
}

const AUCTION_ABI = {
  coinbase: CoinbaseABI,
  chainXAuction: ChainXAuctionV2ABI,
  chainYVault: ChainYVaultV2ABI,
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