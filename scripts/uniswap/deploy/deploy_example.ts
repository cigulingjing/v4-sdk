import{ethers} from "hardhat";
import { RPC_URL, PRIVATE_KEY,CONTRACT_ADDRESSES } from "../config";
import { isDeployed } from "../lib/utils";
import { create2Deploy } from "./help";

async function main(){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const walletAddress = await wallet.getAddress();
    

    // Normal deploy
    const ExampleFactory = await ethers.getContractFactory("Example", wallet);
    const example = await ExampleFactory.deploy(0);
    await example.deployed();
    console.log(`normally deployed at: ${example.address} by ${walletAddress}`);


    // Create2 deploy
    const factoryAddr = CONTRACT_ADDRESSES["Create2"]
    if (!await isDeployed(provider, factoryAddr)) throw new Error("Factory is not deployed");
    const create2Contract = await ethers.getContractAt("Create2", factoryAddr, wallet);
    const salt: bigint = BigInt(111);
    let exampleAddr = await create2Deploy(create2Contract, "Example", ["uint256"], [0], salt);
    console.log(`create2 deployed at: ${exampleAddr} by ${walletAddress}`);
};




main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });