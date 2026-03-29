import { ethers } from "hardhat";
import { AUCTION_ADDR } from "../../config/auction.config";
import { Signer } from "ethers";

export async function deployYVault(wallet: Signer, coinbaseAddr: string) {
    const ChainYVaultV2Factory = await ethers.getContractFactory("ChainYVaultV2", wallet);
    const contract = await ChainYVaultV2Factory.deploy(coinbaseAddr);
    await contract.deployed();
    return contract.address;
}


async function main(){
    const [wallet] = await ethers.getSigners();
    const yVaultAddr = await deployYVault(wallet, AUCTION_ADDR.coinbase);
    console.log("ChainYVaultV2 deployed to:", yVaultAddr);
};

if (require.main === module) {
    main();
}