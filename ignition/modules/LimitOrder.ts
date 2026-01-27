import { ethers } from "hardhat";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { CONTRACT_ADDRESSES, CONTRACTS } from "../../config/uniswap.config";

function encoder(types: string[], values: any[]): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(types, values);
    return encodedParams.slice(2);
}

// ref: https://hardhat.org/ignition/docs/guides/create2
// use "@nomicfoundation/hardhat-ignition-ethers" in config
// npx hardhat ignition deploy ignition/modules/LimitOrder.ts --strategy create2
export default buildModule("LimitOrder", (m) => {
    // Load the contract artifact
    const contractArtifact = CONTRACTS["LimitOrder"];
    const types = ["address"];
    const params = [CONTRACT_ADDRESSES.PoolManager];
    const artifact = {
        _format: "hh-sol-artifact-1",
        contractName: "LimitOrder",
        sourceName: "contracts/LimitOrder.sol",
        abi: contractArtifact.abi, // Populate with ABI array
        bytecode: contractArtifact.bytecode.object,
        deployedBytecode: contractArtifact.bytecode.object,
        linkReferences: {},
        deployedLinkReferences: {},
    };

    // Deploy the contract
    const limitOrder = m.contract("LimitOrder", artifact, params);
    return { limitOrder };
});