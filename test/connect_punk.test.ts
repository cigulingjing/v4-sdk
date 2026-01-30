
import { utils } from "ethers";
import { ethers } from "hardhat";
import { MUTI_VOUCHER_ADDR } from "../config/voucher.config";
import { RPC_URL} from "../config/env.config"

async function getCode(address:string){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(address);
    if (code === "0x"){
        console.log(`Contract ${address} is not deployed`);
    }else{
        console.log("contract code:",code)
    }
}

// 判断是否链接到punk链
// npx hardhat run  test/connect_punk.test.ts --network punk 命令可以执行
// TODO: 转化为test风格
function main(){
    getCode(MUTI_VOUCHER_ADDR);
}

if (require.main === module){
    main(); 
}
