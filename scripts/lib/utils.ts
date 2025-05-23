import { JsonRpcProvider } from "ethers";

export async function isDeployed(provider: JsonRpcProvider, address: string) {
    let code = await provider.getCode(address);
    // console.log("code =", code);
    return code !== "0x";
}