
import {
    CreateAuctionConfigParams,
    CreateAuctionParamsY,
    UnlockTokensParams,
} from "./type";
import { Contract, Signer, utils } from "ethers";

export function toWei(valueEth: string): bigint {
    return utils.parseEther(valueEth).toBigInt();
}

export interface ChainYVaultClientConfig {
    contractAddress: string;
    contractAbi: string;
    signer: Signer;
}

export interface ChainYVaultClientApi {
    createAuctionConfig(
        params: CreateAuctionConfigParams
    ): Promise<string>;
    createAuction(
        params: CreateAuctionParamsY
    ): Promise<{
        txHash: string;
        auctionId?: string;
        lockId?: string;
    }>;
    unlockTokens(
        params: UnlockTokensParams
    ): Promise<{
        txHash: string;
        recipient?: string;
        amount?: bigint;
    }>;
    getAuctionInfo(auctionId: string | number): Promise<{
        auctionType: number;
        baseAmount: bigint;
        revealTime: bigint;
    }>;
    getAuctionLockInfo(lockId: string): Promise<{
        owner: string;
        amount: bigint;
        isLocked: boolean;
        revealTime: bigint;
    }>;
    getActiveAuctionsCount(): Promise<bigint>;
}


export class ChainYVaultClient implements ChainYVaultClientApi {
    private contract: Contract;

    constructor(config: ChainYVaultClientConfig) {
        this.contract = new Contract(
            config.contractAddress,
            config.contractAbi,
            config.signer
        );
    }

    // 创建 Auction 配置
    async createAuctionConfig({
        auctionType,
        baseAmountEth,
        extendSeconds,
    }: CreateAuctionConfigParams): Promise<string> {
        const tx = await this.contract.createAuctionConfig(
            auctionType,
            toWei(baseAmountEth),
            extendSeconds
        );

        await tx.wait();
        return tx.hash;
    }

    // 创建Auction
    async createAuction({
        configId,
        secretText,
        expirationTs,
        amountEth,
    }: CreateAuctionParamsY): Promise<{
        txHash: string;
        auctionId?: string;
        lockId?: string;
    }> {
        const hashSecret = utils.keccak256(
            utils.toUtf8Bytes(secretText)
        );

        const tx = await this.contract.createAuction(
            configId,
            hashSecret,
            expirationTs,
            { value: toWei(amountEth) }
        );

        const receipt = await tx.wait();
        const evt = receipt.events?.find(
            (e: any) => e.event === "TokensLocked"
        );

        return {
            txHash: tx.hash,
            auctionId: evt?.args?.auctionId,
            lockId: evt?.args?.lockId,
        };
    }

    // 解锁Token
    async unlockTokens({
        lockId,
        rawReceipt,
    }: UnlockTokensParams): Promise<{
        txHash: string;
        recipient?: string;
        amount?: bigint;
    }> {
        const tx = await this.contract.unlockTokens(lockId, rawReceipt);
        const receipt = await tx.wait();

        const evt = receipt.events?.find(
            (e: any) => e.event === "TokensUnlocked"
        );

        return {
            txHash: tx.hash,
            recipient: evt?.args?.recipient,
            amount: evt?.args?.amount,
        };
    }

    // 查询拍卖信息
    async getAuctionInfo(auctionId: string | number): Promise<{
        auctionType: number;
        baseAmount: bigint;
        revealTime: bigint;
    }> {
        const result = await this.contract.getAuctionInfo(auctionId);
        return {
            auctionType: result[0],
            baseAmount: result[1].toBigInt(),
            revealTime: result[2].toBigInt(),
        };
    }

    // 查询锁仓信息
    async getAuctionLockInfo(lockId: string): Promise<{
        owner: string;
        amount: bigint;
        isLocked: boolean;
        revealTime: bigint;
    }> {
        const result = await this.contract.getAuctionLockInfo(lockId);
        return {
            owner: result[0],
            amount: result[1].toBigInt(),
            isLocked: result[2],
            revealTime: result[3].toBigInt(),
        };
    }

    // 获取当前激活拍卖数量
    async getActiveAuctionsCount(): Promise<bigint> {
        const count = await this.contract.getActiveAuctionsCount();
        return count.toBigInt();
    }
}

