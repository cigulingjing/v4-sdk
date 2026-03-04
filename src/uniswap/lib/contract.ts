import {Wallet , Contract} from "ethers";
import { CONTRACT_ADDRESSES , CONTRACTS_ABI} from "../../../config/uniswap.config";
import { ethers } from "ethers";

// Helper to extract ABI array from artifact object if necessary
function getAbi(artifact: any): any[] {
  return artifact.abi ? artifact.abi : artifact;
}

export async function getContract(wallet:Wallet, name:string): Promise<Contract> {
    const address = CONTRACT_ADDRESSES[`${name}` as keyof typeof CONTRACT_ADDRESSES]; 
    console.log(`[SDK] Getting contract ${name} at address: ${address}`);
    
    // Verify code exists if on a provider (optional check, good for debugging)
    if (wallet.provider) {
        const code = await wallet.provider.getCode(address);
        if (code === "0x") {
            console.error(`[SDK] WARNING: Contract ${name} at ${address} has NO CODE (it is empty). Check your network connection or deployment.`);
        }
    }

    switch(name){
        case "Token0":
            return new ethers.Contract(CONTRACT_ADDRESSES.Token0, getAbi(CONTRACTS_ABI.MockERC20), wallet);
        case "Token1":
            return new ethers.Contract(CONTRACT_ADDRESSES.Token1, getAbi(CONTRACTS_ABI.MockERC20), wallet);
        case "LiquidPool":
            return new ethers.Contract(CONTRACT_ADDRESSES.LiquidPool, getAbi(CONTRACTS_ABI.LiquidPool), wallet);
        case "LimitOrder":
            return new ethers.Contract(CONTRACT_ADDRESSES.LimitOrder, getAbi(CONTRACTS_ABI.LimitOrder), wallet);
        default:
            throw new Error(`Contract(${name}) initial method not defined`);
    }
}