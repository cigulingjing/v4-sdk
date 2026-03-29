import { ethers } from "hardhat";
import { AUCTION_ADDR } from "../../config/auction.config";
import { Signer } from "ethers";

export async function deployXAuction(wallet: Signer,chainYVaultV2Addr:string) : Promise<string> {
  const ChainXAuctionFactory=await ethers.getContractFactory("ChainXAuctionV2", wallet);
  const chainXAuction=await ChainXAuctionFactory.deploy(chainYVaultV2Addr);
  await chainXAuction.deployed();

  return chainXAuction.address;
}


async function main(){
  const [wallet] = await ethers.getSigners();
  const xAuctionAddr = await deployXAuction(wallet, AUCTION_ADDR.chainYVault);
  console.log(`ChainXAuctionV2 deployed at: ${xAuctionAddr} by ${wallet.address}`);
};

if (require.main === module) {
    main();
}