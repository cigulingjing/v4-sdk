import { ethers } from "hardhat";
import { RPC_URL, PRIVATE_KEY } from "../config/env.config";

// 事实上在punk链上不需要部署Voucher，其是创世块部署的.
async function main() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();

    // Normal deploy
    const MutiVoucherFactory = await ethers.getContractFactory("MutiVoucher", wallet);
    const Voucher = await MutiVoucherFactory.deploy();
    await Voucher.deployed();
    console.log(`MutiVoucher contract is deployed at: ${Voucher.address} by account(${walletAddress})`);
};

main().catch(error => {
    console.error(error);
    process.exit(1);
});