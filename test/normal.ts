
import { utils } from "ethers";
import { ethers } from "hardhat";
import { RPC_URL,CONTRACTS, CONTRACT_ADDRESSES } from "../config/uniswap.config";

async function getCode(address:string){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(address);
    if (code === "0x"){
        console.log(`Contract ${address} is not deployed`);
    }
}

function main(){
    const name = "InvalidTickLower()";
    const selector = utils.id(name).substring(0, 10) 
    console.log("%s abi encode:%s",name,selector);
 
    // const encoded = utils.defaultAbiCoder.encode(["string"], [name]);
    // console.log(encoded); 
    getCode(CONTRACT_ADDRESSES.Create2);
    getCode(CONTRACT_ADDRESSES.Token0);
    getCode(CONTRACT_ADDRESSES.Token1);
    getCode(CONTRACT_ADDRESSES.PoolManager);
    getCode(CONTRACT_ADDRESSES.LiquidPool);
    getCode(CONTRACT_ADDRESSES.LimitOrder);
    getCode(CONTRACT_ADDRESSES.DynamicFee);
}

if (require.main === module){
    main(); 
}
