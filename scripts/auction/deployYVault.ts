import{ ethers } from "hardhat";
import { RPC_URL, PRIVATE_KEY, coinbaseAddr } from "../../config/auction.config";
import { Wallet } from "ethers";

export async function deployYVault(wallet: Wallet, coinbaseAddr: string) {
  const ChainYVaultV2Factory = await ethers.getContractFactory("ChainYVaultV2", wallet);
  const contract = await ChainYVaultV2Factory.deploy(coinbaseAddr);
  await contract.deployed();
  return contract.address;
}

async function main(){
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const yVaultAddr = await deployYVault(wallet, coinbaseAddr);
  console.log("ChainYVaultV2 deployed to:", yVaultAddr);
};

if (require.main === module) {
    main();
}