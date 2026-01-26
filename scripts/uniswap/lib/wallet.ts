import {ethers} from "hardhat";
import {Wallet , Contract} from "ethers";
import { CONTRACT_ADDRESSES } from "../config";

export async function getContract(wallet:Wallet, name:string): Promise<Contract> {
    switch(name){
        case "Token0":
            return await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token0, wallet);
        case "Token1":
            return await ethers.getContractAt("MockERC20", CONTRACT_ADDRESSES.Token1, wallet);
        case "LiquidPool":
            return await ethers.getContractAt("LiquidPool", CONTRACT_ADDRESSES.LiquidPool, wallet);
        case "LimitOrder":
            return await ethers.getContractAt("LimitOrder", CONTRACT_ADDRESSES.LimitOrder, wallet);
        default:
            throw new Error(`Contract(${name}) initial method not defined`);
    }
}