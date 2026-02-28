import { ethers } from "hardhat";

import { CONTRACT_ADDRESSES, RPC_URL, PRIVATE_KEY } from "../../../config/uniswap.config";
import { create2Deploy } from "./help";


async function deployDemo() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    const name: string = "MockDaiToken";
    const symbol: string = "MOCKDAI";
    const initialSupply = BigInt(1);

    console.log(`Deployer: ${walletAddress}, Deployer balance: ${ethers.utils.formatEther(await wallet.getBalance())} ETH`);
    // 1. Contract factory deploy, normally deploy
    // const MockERC20 = await ethers.getContractFactory("MockERC20", wallet);
    // const mockERC20 = await MockERC20.deploy(name, symbol, initialSupply);
    // await mockERC20.deployed();
    // const tokenAddress = mockERC20.address;
    // console.log("deploy to address:", tokenAddress);
    // const deployerBalance = await mockERC20.balanceOf(wallet.address);
    // console.log(`deployer ${symbol} balance: ${ethers.utils.formatUnits(deployerBalance, 18)}`);

    // 2. Deploy with create2
    deployMockERC20(name,symbol,initialSupply);
}
// Deploy MockERC20 contract using Create2
export async function deployMockERC20(name:string,symbol:string,initialSupply:bigint) : Promise<string> {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const create2Contract=await ethers.getContractAt("Create2",CONTRACT_ADDRESSES.Create2, wallet);
    let deployAddress=await create2Deploy(create2Contract,"MockERC20",["string","string","uint256"],[name,symbol,initialSupply],BigInt(123456789));
    console.log(`MockERC20Custom deployed by Create2 to: ${deployAddress}`);
    return deployAddress;
}


if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    deployDemo();
}