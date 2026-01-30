
import  { getAuctionID } from "./serialize";
import {
  CreateAuctionConfigParams,
  SetUnlockStrategyParams,
  CreateAuctionParams,
  UnlockTokensParams,
} from "./type";
import {getSigner} from "../lib/signer";
import {RPC_URL, PRIVATE_KEY,AUCTION_ADDR,AUCTION_ABI} from "../../config/auction.config";
import {Wallet,Contract,providers,Signer, utils} from "ethers";
import { MatchResultWithdrawnEvent } from "./event";

async function getChainYContract(signer:Wallet) {
    const abi= AUCTION_ABI.chainYVault.abi;
    return new Contract(AUCTION_ADDR.chainYVault, abi, signer);
}


export function getProvider(): providers.JsonRpcProvider {
    return new providers.JsonRpcProvider(RPC_URL);
}

export function toWei(valueEth: string): bigint {
    return utils.parseEther(valueEth).toBigInt();
}


// 创建 Auction 配置
export async function createAuctionConfig({
    auctionType,
    baseAmountEth,
    extendSeconds,
}: CreateAuctionConfigParams): Promise<string> {
    const signer = getSigner(RPC_URL,PRIVATE_KEY);
    const vault = await getChainYContract(signer);

    const tx = await vault.createAuctionConfig(
        auctionType,
        toWei(baseAmountEth),
        extendSeconds
    );

    await tx.wait();
    return tx.hash;
}

// 创建Auction
export async function createAuction({
    configId,
    secretText,
    expirationTs,
    amountEth,
}: CreateAuctionParams): Promise<{
    txHash: string;
    auctionId?: string;
    lockId?: string;
}> {
    const signer = getSigner(RPC_URL,PRIVATE_KEY);
    const vault = await getChainYContract(signer);
    const hashSecret = utils.keccak256(
        utils.toUtf8Bytes(secretText)
    );

    const tx = await vault.createAuction(
        configId,
        hashSecret,
        expirationTs,
        { value: toWei(amountEth) }
    );

    const receipt = await tx.wait();
    const evt = receipt.events?.find(
        (e:any) => e.event === "TokensLocked"
    );

    return {
        txHash: tx.hash,
        auctionId: evt?.args?.auctionId,
        lockId: evt?.args?.lockId,
    };
}

// 解锁Token
export async function unlockTokens({
    lockId,
    rawReceipt,
}: UnlockTokensParams): Promise<{
    txHash: string;
    recipient?: string;
    amount?: bigint;
}> {
    const signer = getSigner(RPC_URL,PRIVATE_KEY);
    const vault = await getChainYContract(signer);

    const tx = await vault.unlockTokens(lockId, rawReceipt);
    const receipt = await tx.wait();

    const evt = receipt.events?.find(
        (e:any) => e.event === "TokensUnlocked"
    );

    return {
        txHash: tx.hash,
        recipient: evt?.args?.recipient,
        amount: evt?.args?.amount,
    };
}

// 查询拍卖信息
export async function getAuctionInfo(auctionId: string | number): Promise<{
    auctionType: number;
    baseAmount: bigint;
    revealTime: bigint;
}> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const vault = await getChainYContract(signer);

    const result = await vault.getAuctionInfo(auctionId);
    return {
        auctionType: result[0],
        baseAmount: result[1].toBigInt(),
        revealTime: result[2].toBigInt(),
    };
}

// 查询锁仓信息
export async function getAuctionLockInfo(lockId: string): Promise<{
    owner: string;
    amount: bigint;
    isLocked: boolean;
    revealTime: bigint;
}> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const vault = await getChainYContract(signer);

    const result = await vault.getAuctionLockInfo(lockId);
    return {
        owner: result[0],
        amount: result[1].toBigInt(),
        isLocked: result[2],
        revealTime: result[3].toBigInt(),
    };
}

// 获取当前激活拍卖数量
export async function getActiveAuctionsCount(): Promise<bigint> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const vault = await getChainYContract(signer);
    const count = await vault.getActiveAuctionsCount();
    return count.toBigInt();
}

