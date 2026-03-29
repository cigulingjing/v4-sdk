import { ethers } from "hardhat";
import { Signer } from "ethers";

export async function deployCoinbase(wallet: Signer): Promise<string> {
  const CoinBaseFactory=await ethers.getContractFactory("Coinbase", wallet);
  const coinbase=await CoinBaseFactory.deploy();
  await coinbase.deployed();
  return coinbase.address;
}

async function main(){
  const [wallet] = await ethers.getSigners();
  const coinbaseAddr = await deployCoinbase(wallet);
  console.log(`Coinbase deployed at: ${coinbaseAddr} by ${wallet.address}`);
};

if (require.main === module) {
    main();
}