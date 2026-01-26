#!/usr/bin/env node
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const vaultAddress = process.env.VAULT_ADDR;
  if (!vaultAddress) {
    throw new Error("VAULT_ADDR env not set (initial vault address for ChainXAuctionV2)");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const ChainXAuctionV2 = await hre.ethers.getContractFactory("ChainXAuctionV2");
  const contract = await ChainXAuctionV2.deploy(vaultAddress);
  await contract.deployed();

  console.log("ChainXAuctionV2 deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
