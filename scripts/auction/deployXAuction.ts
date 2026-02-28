import{ ethers } from "hardhat";
import { RPC_URL, PRIVATE_KEY, AUCTION_ADDR} from "../../config/auction.config";
import { Wallet } from "ethers";

export async function deployXAuction(wallet:Wallet,chainYVaultV2Addr:string) : Promise<string> {
  const ChainXAuctionFactory=await ethers.getContractFactory("ChainXAuctionV2", wallet);
  const chainXAuction=await ChainXAuctionFactory.deploy(chainYVaultV2Addr);
  await chainXAuction.deployed();

  return chainXAuction.address;
}


async function main(){
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const xAuctionAddr = await deployXAuction(wallet,AUCTION_ADDR.chainYVault);
  console.log(`ChainXAuctionV2 deployed at: ${xAuctionAddr} by ${wallet.address}`);
};

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    main();
}