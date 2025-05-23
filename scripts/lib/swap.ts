import { Contract } from "ethers";
import { SwapParams } from "./types";

export async function executeSwap(contract: Contract, swapParams: SwapParams, hookData: string) {
    let tx = await contract.executeSwap(swapParams, hookData);
    await tx.wait();
    console.log("Swap executed successfully");
}