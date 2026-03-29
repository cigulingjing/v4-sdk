
import { getAuctionID, buildAuctionCreatedReceipt, buildAuctionCreatedTx } from "./serialize";
import { Contract, Signer, utils } from "ethers";
import {
    CreateAuctionParamsX,
    PlaceBidParams,
    RevealBidParams,
    RevealLockParams,
    SubmitMatchResultsParams,
    WithdrawMatchResultParams,
} from "./type";

export interface ChainXAuctionClientConfig {
    contractAddress: string;
    contractAbi: string;
    signer: Signer;
    chainYVault: string;
    gasPriceGwei?: string;
    gasLimit?: bigint;
}

export interface ChainXAuctionClientApi {
    createAuction(
        params: CreateAuctionParamsX
    ): Promise<{ auctionId: string; revealStartTime: bigint }>;
    placeBid(
        params: PlaceBidParams
    ): Promise<{ bidValue: string; secretHash: string }>;
    revealBid(params: RevealBidParams): Promise<void>;
    revealLock(params: RevealLockParams): Promise<void>;
    submitMatchResults(
        params: SubmitMatchResultsParams
    ): Promise<void>;
    withdrawMatchResult(
        params: WithdrawMatchResultParams
    ): Promise<void>;
    getLockInfo(
        auctionId: string,
        lockId: string
    ): Promise<{ exists: boolean; revealTime: bigint; secret: string }>;
    getMatchResult(
        auctionId: string,
        bidder: string
    ): Promise<{ lockId: string; isWithdrawn: boolean }>;
}

export class ChainXAuctionClient implements ChainXAuctionClientApi {
    private contract: Contract;
    private signer: Signer;
    private chainYVault: string;
    private gasPriceGwei: string;
    private gasLimit: bigint;

    constructor(config: ChainXAuctionClientConfig) {
        this.contract = new Contract(
            config.contractAddress,
            config.contractAbi,
            config.signer
        );
        this.signer = config.signer;
        this.chainYVault = config.chainYVault;
        this.gasPriceGwei = config.gasPriceGwei ?? "1";
        this.gasLimit = config.gasLimit ?? BigInt(52_200);
    }

    private getProvider(): NonNullable<Signer["provider"]> {
        if (!this.signer.provider) {
            throw new Error("signer provider not set");
        }
        return this.signer.provider;
    }

    async createAuction(
        params: CreateAuctionParamsX
    ): Promise<{ auctionId: string; revealStartTime: bigint }> {
        const { seller, sourceChainId, activeAuctionCount, auctionType } = params;

        const provider = this.getProvider();
        const nonce = await provider.getTransactionCount(await this.signer.getAddress());

        const chainId =
            sourceChainId ?? (await provider.getNetwork()).chainId;

        const auctionId = getAuctionID(
            seller,
            chainId,
            this.chainYVault,
            activeAuctionCount
        );

        const rawTx = await buildAuctionCreatedTx({
            nonce: nonce,
            gasPrice: utils.parseUnits(this.gasPriceGwei, "gwei").toBigInt(),
            gasLimit: this.gasLimit,
            to: this.chainYVault,
            value: BigInt(0),
            chainId: chainId,
            data: "0x",
        });
        const signedTx = await this.signer.signTransaction(rawTx);
        const revealStartTime = BigInt(Math.floor(Date.now() / 1000) + 60);

        const rawRecpt = buildAuctionCreatedReceipt({
            auctionId,
            auctionType,
            activeAuctionCount: activeAuctionCount,
            revealTime: revealStartTime,
        });

        const crossChainMessage =
            utils.defaultAbiCoder.encode(
                ["tuple(uint256, bytes, bytes)"],
                [[chainId, signedTx, rawRecpt]]
            );

        const tx = await this.contract.createAuction(crossChainMessage);
        await tx.wait();

        return { auctionId, revealStartTime };
    }

    async placeBid(
        params: PlaceBidParams
    ): Promise<{ bidValue: string; secretHash: string }> {
        const { auctionId, seller, valueEth, secretText = "secret" } = params;

        const value = utils.parseEther(valueEth);
        const bidValue = utils.hexZeroPad(
            value.toHexString(),
            32
        );
        const secretHash = utils.keccak256(
            utils.toUtf8Bytes(secretText)
        );

        const depositAmount = value.mul(15).div(10);

        const tx = await this.contract.placeBid(
            auctionId,
            seller,
            secretHash,
            bidValue,
            { value: depositAmount }
        );
        await tx.wait();

        return { bidValue, secretHash };
    }

    async revealBid(
        params: RevealBidParams
    ): Promise<void> {
        const value = utils.parseEther(params.valueEth);
        const salt =
            params.saltHex ?? utils.randomBytes(32);

        const tx = await this.contract.revealBid(
            params.auctionId,
            value,
            salt
        );
        await tx.wait();
    }

    async revealLock(
        params: RevealLockParams
    ): Promise<void> {
        const value = utils.parseEther(params.valueEth);
        const salt = params.saltHex ?? utils.randomBytes(32);

        const tx = await this.contract.revealLock(
            params.auctionId,
            params.lockId,
            value,
            salt
        );
        await tx.wait();
    }

    async submitMatchResults(
        params: SubmitMatchResultsParams
    ): Promise<void> {
        const finalValues = params.finalValuesEth.map((v) =>
            utils.parseEther(v)
        );

        const tx = await this.contract.submitMatchResults(
            params.auctionId,
            params.lockIds,
            params.bidders,
            finalValues
        );
        await tx.wait();
    }

    async withdrawMatchResult(
        params: WithdrawMatchResultParams
    ): Promise<void> {
        const tx = await this.contract.withdrawMatchResult(
            params.auctionId,
            params.lockId
        );
        await tx.wait();
    }

    async getLockInfo(
        auctionId: string,
        lockId: string
    ): Promise<{ exists: boolean; revealTime: bigint; secret: string }> {
        const result = await this.contract.getLockInfo(auctionId, lockId);
        return {
            exists: result[0],
            revealTime: result[1].toBigInt(),
            secret: result[2],
        };
    }

    async getMatchResult(
        auctionId: string,
        bidder: string
    ): Promise<{ lockId: string; isWithdrawn: boolean }> {
        const result = await this.contract.getMatchResult(auctionId, bidder);
        return {
            lockId: result[0],
            isWithdrawn: result[1],
        };
    }
}

