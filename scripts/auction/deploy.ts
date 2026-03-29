import { ethers } from "hardhat";
import { deployCoinbase } from "./deployCoinbase";
import { deployXAuction } from "./deployXAuction";
import { deployYVault } from "./deployYVault";

async function main(){
    const [wallet] = await ethers.getSigners();

    const coinbaseAddr = await deployCoinbase(wallet);
    const yVaultAddr = await deployYVault(wallet, coinbaseAddr);
    const xAuctionAddr = await deployXAuction(wallet, yVaultAddr);
    console.log("Deployment Summary:");
    console.log(`Coinbase Address: ${coinbaseAddr}`);
    console.log(`ChainYVaultV2 Address: ${yVaultAddr}`);
    console.log(`ChainXAuctionV2 Address: ${xAuctionAddr}`);
};

if (require.main === module) {
    main();
}