import { Wallet, providers } from "ethers";

export function addressFromPrivateKey(pk: string): string {
	return new Wallet(pk).address;
}

export function getSigner(
	rpcUrl: string,
	privateKey: string
): Wallet {
	if (!privateKey) {
		throw new Error("PRIVATE_KEY not set");
	}
	const provider = new providers.JsonRpcProvider(rpcUrl);
	return new Wallet(privateKey, provider);
}

export function getProvider(rpcUrl:string): providers.JsonRpcProvider {
	return new providers.JsonRpcProvider(rpcUrl);
}