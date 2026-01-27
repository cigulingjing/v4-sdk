import {
  RPC_URL,
  PRIVATE_KEY,
  config,
} from "./env.config";


const chainXAuctionV2Addr=config.contracts.auction.chainXAuctionV2;
const chainYVaultV2Addr=config.contracts.auction.chainYVaultV2;
const coinbaseAddr=config.contracts.auction.coinbase;

export { RPC_URL, PRIVATE_KEY };
export {chainXAuctionV2Addr,chainYVaultV2Addr,coinbaseAddr};

if (require.main === module) {
    console.log("=== Auction 配置验证 ===\n");
    console.log("合约地址:");
    console.log("ChainYVaultV2:", chainYVaultV2Addr);
    console.log("ChainXAuctionV2:", chainXAuctionV2Addr);   
    console.log("Coinbase:", coinbaseAddr); 
}