import {
	BigNumber,
	BigNumberish,
	Contract,
	ContractTransaction,
	Signer,
	providers,
	utils,
} from "ethers";

import { MUTI_VOUCHER_ABI,MUTI_VOUCHER_ADDR } from "../config/voucher.config";


export const mutiVoucherABI = MUTI_VOUCHER_ABI.abi;

export type SignerOrProvider = Signer | providers.Provider;

export function getVoucherContract(
	contractAddress: string,
	signerOrProvider: SignerOrProvider
): Contract {
	return new Contract(contractAddress, mutiVoucherABI, signerOrProvider);
}

export async function createVoucher(
	contractAddress: string,
	signer: Signer,
	name: string,
	conversionRate: BigNumberish
): Promise<ContractTransaction> {
	const contract = getVoucherContract(contractAddress, signer);
	return contract.createVoucher(name, conversionRate);
}

export async function getVoucherInfo(
	contractAddress: string,
	provider: SignerOrProvider,
	name: string
): Promise<BigNumber> {
	const contract = getVoucherContract(contractAddress, provider);
	return contract.getVoucherInfo(name);
}

export async function buyVoucher(
	contractAddress: string,
	signer: Signer,
	name: string,
	valueWei: BigNumberish
): Promise<ContractTransaction> {
	const contract = getVoucherContract(contractAddress, signer);
	return contract.buy(name, { value: valueWei });
}

export async function buyVoucherWithEth(
	contractAddress: string,
	signer: Signer,
	name: string,
	valueEth: string
): Promise<ContractTransaction> {
	const valueWei = utils.parseEther(valueEth);
	return buyVoucher(contractAddress, signer, name, valueWei);
}

// UseVoucher不是直接调用的
export async function useVoucher(
	contractAddress: string,
	signer: Signer,
	name: string,
	amount: BigNumberish
): Promise<ContractTransaction> {
	const contract = getVoucherContract(contractAddress, signer);
	return contract.use(name, amount);
}

export async function balanceOf(
	contractAddress: string,
	provider: SignerOrProvider,
	name: string,
	user: string
): Promise<BigNumber> {
	const contract = getVoucherContract(contractAddress, provider);
	return contract.balanceOf(name, user);
}

export async function getAllVouchers(
	contractAddress: string,
	provider: SignerOrProvider
): Promise<string[]> {
	const contract = getVoucherContract(contractAddress, provider);
	return contract.getAllVouchers();
}

// 仅仅能够在punk链上使用
function buildUseVoucherPrefix(voucherNameBytes32: string): string {
	const nameHex = utils.hexlify(voucherNameBytes32).replace(
		/^0x/,
		""
	);
    
	if (nameHex.length > 64) {
		throw new Error("Voucher name too long for 32 bytes");
	}
	const paddedName = nameHex.padEnd(64, "0");
    console.log(paddedName)
	return `0x0A0D03${paddedName}`;
}

// 仅仅能够在punk链上使用
export function BuildUseVoucherTx(
	tx: providers.TransactionRequest,
	voucherName: string
): providers.TransactionRequest {
	const prefix = buildUseVoucherPrefix(voucherName);
	const rawData = tx.data ?? "0x";
	const dataHex = utils.hexlify(rawData);
	const mergedData = utils.hexConcat([prefix, dataHex]);

	return {
		...tx,
		data: mergedData,
	};
}