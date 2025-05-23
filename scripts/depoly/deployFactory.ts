import { ethers } from "hardhat"; // Import ethers from Hardhat
import { RPC_URL, PRIVATE_KEY } from "../config";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  // const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const wallet = await provider.getSigner();
  
  const Factory = await ethers.getContractFactory("DeterministicDeployFactory", wallet);
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("Factory deployed to:", factory.target);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error);
  process.exit(1);
});
