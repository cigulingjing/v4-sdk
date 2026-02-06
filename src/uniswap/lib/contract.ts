import {Wallet , Contract} from "ethers";
import { CONTRACT_ADDRESSES , CONTRACTS_ABI} from "../../../config/uniswap.config";
import { ethers } from "ethers";

export async function getContract(wallet:Wallet, name:string): Promise<Contract> {
    switch(name){
        case "Token0":
            return new ethers.Contract(CONTRACT_ADDRESSES.Token0,CONTRACTS_ABI.MockERC20,wallet);
        case "Token1":
            return new ethers.Contract(CONTRACT_ADDRESSES.Token1,CONTRACTS_ABI.MockERC20,wallet);
        case "LiquidPool":
            return new ethers.Contract(CONTRACT_ADDRESSES.LiquidPool,CONTRACTS_ABI.LiquidPool,wallet);
        case "LimitOrder":
            return new ethers.Contract(CONTRACT_ADDRESSES.LimitOrder,CONTRACTS_ABI.LimitOrder,wallet);
        default:
            throw new Error(`Contract(${name}) initial method not defined`);
    }
}