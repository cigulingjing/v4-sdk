import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { CONTRACTS, POOL_KEYS, RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESSES } from "../config";
import { bigintToBytes32,bytecodeWithArgs } from "../lib/utils";

// Constants that correspond to the ones in Solidity
const FLAG_MASK = BigInt(0x3FFF);
const MAX_LOOP = 100_000;

// create2Deploy deploys a contract using CREATE2 via the Create2 factory contract
export async function create2Deploy(create2: Contract, contractName: string, types: string[], params: any[], salt: bigint) :Promise<string>{

    // Load the contract artifact using TypeScript
    const scArtifact = CONTRACTS[contractName];
    if (scArtifact==null){
        throw new Error(`Contract artifact for ${contractName} not found`);
    }
    let bytecode = scArtifact.bytecode;

    if (bytecode == undefined || bytecode.length == 0) {
        console.log("bytecode length is zero");
        throw new Error(`Bytecode for contract ${contractName} is undefined or empty`);
    }

    const initCode = bytecodeWithArgs(bytecode, types, params);
    const create2Addr = getCreate2Address(await create2.address, salt, initCode);
    // console.log(`precomputed ${contractName} address: ${create2Addr}`);

    const saltHex = bigintToBytes32(salt);
    const tx = await create2.deployCreate2WithSalt(initCode,saltHex, { gasLimit: 30_000_000 });
    await tx.wait();

    console.log(`deterministic deployed ${contractName} by ${tx.hash}`);
    return create2Addr;
}

// Simulate the HookMiner.find function in TypeScript
export async function findHookAddress(
    deployer: string,
    contractName: string,
    types: string[],
    params: any[],
    flags: bigint
): Promise<{ hookAddress: string, salt: bigint }> {
    // Load the contract artifact using TypeScript
    const scArtifact = CONTRACTS[contractName];
    const bytecode = scArtifact.bytecode;
    if (bytecode==undefined || bytecode.length==0){
        throw new Error(`Bytecode for contract ${contractName} is undefined or empty`);
    }

    const creationCodeWithArgs = bytecodeWithArgs(bytecode, types, params);

    let salt = BigInt(0);
    for (let i = 0; i < MAX_LOOP; i++) {
        const hookAddress = getCreate2Address(deployer, salt, creationCodeWithArgs);
        if (hookAddress && (BigInt(hookAddress) & FLAG_MASK) === flags) {
            // Check if the address is not deployed
            const code = await ethers.provider.getCode(hookAddress);
            if (code === "0x") {
                return { hookAddress, salt };
            }
        }
        salt = salt + BigInt(1);
    }
    throw new Error("HookMiner: could not find salt");
}

export function getCreate2Address(factoryAddress: string, salt: bigint, initCode: string): string {
    const saltHex = bigintToBytes32(salt);
    const create2Addr = ethers.utils.getCreate2Address(factoryAddress, saltHex, ethers.utils.keccak256(initCode));
    return create2Addr;
}


export async function deployHookWithFlags(factory: Contract, factoryAddr: string, contractName: string, constructorTypes: string[], constructorValues: any[], flags: bigint) {
    // 1. compute hook address
    const { hookAddress, salt } = await findHookAddress(
        factoryAddr,
        contractName,
        constructorTypes,
        constructorValues,
        flags
    );

    console.log(`\n=== Deploying ${contractName} Hook ===`);
    console.log("Hook Address:", hookAddress);
    console.log("Salt Used:", salt.toString());
    console.log("Salt Keccak256:", ethers.utils.id(salt.toString()));

    // 2. use CREATE2 deploy
    await create2Deploy(
        factory,
        contractName,
        constructorTypes,
        constructorValues,
        salt,
    );
    return hookAddress;
}
