import {Wallet , Contract} from "ethers";
import { CONTRACT_ADDRESSES , CONTRACTS_ABI} from "../../../config/uniswap.config";
import { ethers } from "ethers";

// Helper to extract ABI array from artifact object if necessary
function getAbi(artifact: any): any[] {
  return artifact.abi ? artifact.abi : artifact;
}

export async function getContract(wallet:Wallet, name:string): Promise<Contract> {
    console.log(`Getting contract `, name, CONTRACT_ADDRESSES.LiquidPool);
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