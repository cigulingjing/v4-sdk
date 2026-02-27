
import { utils } from "ethers";
import { ethers } from "hardhat";
import { MUTI_VOUCHER_ADDR } from "../config/voucher.config";
import { PRIVATE_KEY, RPC_URL} from "../config/env.config"
import { util } from "chai";

async function getCode(address:string){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(address);
    if (code === "0x"){
        console.log(`Contract ${address} is not deployed`);
    }else{
        console.log("contract code:",code)
    }
}

async function getBalance(address:string){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address}: ${utils.formatEther(balance)} ETH`);
}

describe("connect test",async function(){
    it("should connect to deployed contract",async function(){
        await getCode(MUTI_VOUCHER_ADDR);
    });

    it("should get balance of contract",async function(){
        let provider=new ethers.providers.JsonRpcProvider(RPC_URL);
        let wallet=new ethers.Wallet(PRIVATE_KEY,provider)

        await getBalance(wallet.address);
    });
});