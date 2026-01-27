import { ethers } from "hardhat"; // Import ethers from 
import type { Wallet } from "ethers";
import { ContractFactory, Contract } from "ethers";

export async function deployCreate2(wallet : Wallet): Promise<string> {  
  const Create2Factory : ContractFactory = await ethers.getContractFactory("Create2", wallet);
  const create2 : Contract = await Create2Factory.deploy();
  await create2.deployed();
  console.log("Factory deployed to:", create2.address);
  return create2.address;
}