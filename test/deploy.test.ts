import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber } from "ethers";
import {CONTRACT_ADDRESSES} from "../scripts/config";

describe("create2 test", function () {
    let value=BigInt(1000);
    let create2: Contract;

    beforeEach(async () => {
        let [deployer] = await ethers.getSigners();
        let Factory = await ethers.getContractFactory("Create2", deployer);
        create2 = await Factory.deploy();
        await create2.deployed();
    });

    it("deploy example.sol",async function() {

        const Contract = await ethers.getContractFactory("Example");
        const contract= await Contract.deploy(BigInt(1000));
        await contract.deployed();

        const storedValue: BigNumber = await contract.getValue();
        expect(storedValue.toBigInt()).to.equal(value);

        const newValue = BigInt(2000);
        const tx = await contract.setValue(newValue);
        await tx.wait();

        const updatedValue: BigNumber = await contract.getValue();
        expect(updatedValue.toBigInt()).to.equal(newValue);
    });

    it ("judge address",async function() {
        const tokenName="Token0";
        let tokenAddress= CONTRACT_ADDRESSES[tokenName] ;
        tokenAddress="0xa8aAB7BbAfC9bb277332b25B3C5BCA74534Df4A7"
        if (await ethers.provider.getCode(tokenAddress)!="0x") {
            console.log(`${tokenName} is deployed at address: ${tokenAddress}`);
        }else{
            console.log(`${tokenName} is not deployed`);
        }
    });
});