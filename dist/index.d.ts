import { Signer, Contract, providers, Wallet, BigNumber, BigNumberish, ContractTransaction } from 'ethers';

interface PlaceBidParams {
    auctionId: string;
    seller: string;
    valueEth: string;
    secretText?: string;
}
interface RevealBidParams {
    auctionId: string;
    valueEth: string;
    saltHex?: string;
}
interface RevealLockParams {
    auctionId: string;
    lockId: string;
    valueEth: string;
    saltHex?: string;
}
interface SubmitMatchResultsParams {
    auctionId: string;
    lockIds: string[];
    bidders: string[];
    finalValuesEth: string[];
}
interface ChallengeMatchResultParams {
    auctionId: string;
    bidder: string;
}
interface WithdrawMatchResultParams {
    auctionId: string;
    lockId: string;
}
interface CreateAuctionConfigParams {
    auctionType: number;
    baseAmountEth: string;
    extendSeconds: number;
}
interface SetUnlockStrategyParams {
    auctionType: number;
    strategyAddress: string;
}
interface CreateAuctionParams {
    seller: string;
    sourceChainId: number;
    activeAuctionCount: bigint;
    auctionType: number;
}
interface CreateAuctionParams {
    configId: number;
    secretText: string;
    expirationTs: number;
    amountEth: string;
}
interface UnlockTokensParams {
    lockId: string;
    rawReceipt: string;
}

declare function getAuctionContract(signer: Signer): Contract;
declare function createAuction$1(params: CreateAuctionParams): Promise<{
    auctionId: string;
    revealStartTime: bigint;
}>;
declare function placeBid(params: PlaceBidParams): Promise<{
    bidValue: string;
    secretHash: string;
}>;
declare function revealBid(params: RevealBidParams): Promise<void>;
declare function revealLock(params: RevealLockParams): Promise<void>;
declare function submitMatchResults(params: SubmitMatchResultsParams): Promise<void>;
declare function withdrawMatchResult(params: WithdrawMatchResultParams): Promise<void>;
declare function getLockInfo(auctionId: string, lockId: string): Promise<{
    exists: boolean;
    revealTime: bigint;
    secret: string;
}>;
declare function getMatchResult(auctionId: string, bidder: string): Promise<{
    lockId: string;
    isChallenged: boolean;
    isWithdrawn: boolean;
}>;

declare function getProvider(): providers.JsonRpcProvider;
declare function toWei(valueEth: string): bigint;
declare function createAuctionConfig({ auctionType, baseAmountEth, extendSeconds, }: CreateAuctionConfigParams): Promise<string>;
declare function createAuction({ configId, secretText, expirationTs, amountEth, }: CreateAuctionParams): Promise<{
    txHash: string;
    auctionId?: string;
    lockId?: string;
}>;
declare function unlockTokens({ lockId, rawReceipt, }: UnlockTokensParams): Promise<{
    txHash: string;
    recipient?: string;
    amount?: bigint;
}>;
declare function getAuctionInfo(auctionId: string | number): Promise<{
    auctionType: number;
    baseAmount: bigint;
    revealTime: bigint;
}>;
declare function getAuctionLockInfo(lockId: string): Promise<{
    owner: string;
    amount: bigint;
    isLocked: boolean;
    revealTime: bigint;
}>;
declare function getActiveAuctionsCount(): Promise<bigint>;

declare function swap(wallet: Wallet, amountIn: bigint, zeroForOne: boolean, hookData: string): Promise<void>;
declare function main(): Promise<void>;

declare function getContract(wallet: Wallet, name: string): Promise<Contract>;

interface PoolKey {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
}
interface SwapParams {
    zeroForOne: boolean;
    amountSpecified: bigint;
    sqrtPriceLimitX96: bigint;
}
interface ModifyPositionParams {
    tickLower: number;
    tickUpper: number;
    liquidityDelta: bigint;
    salt?: string;
}

declare function modifyPosition(contract: Contract, modifyPositionParams: ModifyPositionParams, hookData: string): Promise<void>;
declare function getPoolId(poolKey: PoolKey): string;
declare function getLiquidity(contract: Contract, poolKey: PoolKey): Promise<any>;
declare function getPoolSqrtPrice(liqPool: Contract): Promise<bigint>;
declare function getPoolPrice(liqPool: Contract): Promise<number>;
declare function getCurrentTick(liqPool: Contract): Promise<number>;

declare const mutiVoucherABI: any;
type SignerOrProvider = Signer | providers.Provider;
declare function getVoucherContract(contractAddress: string, signerOrProvider: SignerOrProvider): Contract;
declare function createVoucher(contractAddress: string, signer: Signer, name: string, conversionRate: BigNumberish): Promise<ContractTransaction>;
declare function getVoucherInfo(contractAddress: string, provider: SignerOrProvider, name: string): Promise<BigNumber>;
declare function buyVoucher(contractAddress: string, signer: Signer, name: string, valueWei: BigNumberish): Promise<ContractTransaction>;
declare function buyVoucherWithEth(contractAddress: string, signer: Signer, name: string, valueEth: string): Promise<ContractTransaction>;
declare function useVoucher(contractAddress: string, signer: Signer, name: string, amount: BigNumberish): Promise<ContractTransaction>;
declare function balanceOf(contractAddress: string, provider: SignerOrProvider, name: string, user: string): Promise<BigNumber>;
declare function getAllVouchers(contractAddress: string, provider: SignerOrProvider): Promise<string[]>;
declare function BuildUseVoucherTx(tx: providers.TransactionRequest, voucherName: string): providers.TransactionRequest;

export { BuildUseVoucherTx, type ChallengeMatchResultParams, type CreateAuctionConfigParams, type CreateAuctionParams, type ModifyPositionParams, type PlaceBidParams, type PoolKey, type RevealBidParams, type RevealLockParams, type SetUnlockStrategyParams, type SignerOrProvider, type SubmitMatchResultsParams, type SwapParams, type UnlockTokensParams, type WithdrawMatchResultParams, balanceOf, buyVoucher, buyVoucherWithEth, createAuction$1 as createAuction, createAuctionConfig, createAuction as createAuctionOnVault, createVoucher, getActiveAuctionsCount, getAllVouchers, getAuctionContract, getAuctionInfo, getAuctionLockInfo, getContract, getCurrentTick, getLiquidity, getLockInfo, getMatchResult, getPoolId, getPoolPrice, getPoolSqrtPrice, getProvider, getVoucherContract, getVoucherInfo, main, modifyPosition, mutiVoucherABI, placeBid, revealBid, revealLock, submitMatchResults, swap, toWei, unlockTokens, useVoucher, withdrawMatchResult };
