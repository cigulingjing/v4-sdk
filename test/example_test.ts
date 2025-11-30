import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, BigNumber } from "ethers";

describe("Example", function () {
    let value=BigInt(1000);
    let contract: Contract;

    beforeEach(async () => {
        let [deployer, addr1, addr2] = await ethers.getSigners();
        let Factory = await ethers.getContractFactory("Example", deployer);
        contract = await Factory.deploy(value);
        await contract.deployed();
    });

    it("initial and store",async function() {
        const storedValue: BigNumber = await contract.getValue();
        expect(storedValue.toBigInt()).to.equal(value);

        const newValue = BigInt(2000);
        const tx = await contract.setValue(newValue);
        await tx.wait();

        const updatedValue: BigNumber = await contract.getValue();
        expect(updatedValue.toBigInt()).to.equal(newValue);
    });
});

describe("Example2", function () {
    let value="Hello World!";
    let contract: Contract;
    let contractNmae="Example2";

    beforeEach(async () => {
        let [deployer] = await ethers.getSigners();
        let Factory = await ethers.getContractFactory(contractNmae, deployer);
        contract = await Factory.deploy();
        await contract.deployed();
    });

    it("initial and store",async function() {
        const storedValue = await contract.getName();
        console.log(storedValue);
        expect(storedValue).to.equal(value);

        const tx = await contract.setName(value);
        await tx.wait();

        const updatedValue = await contract.getName();
        console.log(updatedValue);
        expect(updatedValue).to.equal(value);
    });
});

describe("normal test", function () {
    it("hex concat example", function () {
        const hex1 = "0x1111";
        const hex2 = "0x2222";
        const result = ethers.utils.hexConcat([hex1, hex2]);
        console.log(`result: ${result}`);
    });
});