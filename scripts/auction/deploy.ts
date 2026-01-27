import{ ethers } from "hardhat";
import { RPC_URL, PRIVATE_KEY} from "../../config/auction.config";
import { deployCoinbase } from "./deployCoinbase";
import { deployXAuction } from "./deployXAuction";
import { deployYVault } from "./deployYVault";

async function main(){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

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