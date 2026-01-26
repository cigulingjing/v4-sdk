#!/usr/bin/env node
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const coinBaseAddress = process.env.COINBASE_ADDR;
  const ChainYVaultV2 = await hre.ethers.getContractFactory("ChainYVaultV2");
  const contract = await ChainYVaultV2.deploy(coinBaseAddress);
  await contract.deployed();

  console.log("ChainYVaultV2 deployed to:", contract.address);
  console.log("Please update VAULT_ADDR in .env, then deploy ChainXAuctionV2");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
