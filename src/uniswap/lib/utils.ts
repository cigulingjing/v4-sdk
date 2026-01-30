// JsonRpcProvider is runtime object
import { JsonRpcProvider } from "@ethersproject/providers";
import { ethers } from "hardhat"

export async function isDeployed(provider: JsonRpcProvider, address: string) {
    let code = await provider.getCode(address);
    // console.log("code =", code);
    return code !== "0x";
}

export function bigintToBytes32(value : bigint): string {
    return ethers.utils.id(value.toString());   
}

// Function to encode the parameters
export function abiEncode(types: string[], values: any[]): string {
    const abiCoder = ethers.utils.defaultAbiCoder;
    const encodedParams = abiCoder.encode(types, values);
    return encodedParams;
}

export function bytecodeWithArgs(bytecode: string, types: string[], params: any[]): string {
    const encodedParams = abiEncode(types, params);
    const initCode = ethers.utils.hexConcat([bytecode, encodedParams]);
    return initCode;
}
