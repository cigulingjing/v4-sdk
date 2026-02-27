
import { utils } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";


async function ConvertBytes32(){
    const voucherName="BitCoin"
    const voucherNameByte32=ethers.utils.formatBytes32String(voucherName);
    console.log("voucherNameByte32:",voucherNameByte32);

    let parseNameString=ethers.utils.parseBytes32String(voucherNameByte32);
    console.log("parseNameString:",parseNameString);
}

describe("abi encode test",async function(){
    const name = "InvalidTickLower()";
    const selector = utils.id(name).substring(0, 10) 
    console.log("%s abi encode:%s",name,selector);
});

describe("bytes32序列化测试",async function(){
    let name:string="Hello world"; // utf-8 encoding string
    let nameBytes32:string;
    before(async function () {
        nameBytes32 = ethers.utils.formatBytes32String(name);
    });
    it("should convert string to bytes32 and back",async function(){
        console.log("name:", name);
        console.log("nameBytes32:", nameBytes32);
        const parsedName = ethers.utils.parseBytes32String(nameBytes32);
        console.log("parsedName:", parsedName);
        expect(parsedName).to.equal(name);
    });
    it("voucher's bytes32:",async function(){
        const serviceName="Service"
        const serviceByte32=ethers.utils.formatBytes32String(serviceName);
        console.log("serviceByts:",serviceByte32);
    });
});