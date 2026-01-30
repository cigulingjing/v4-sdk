
import { RPC_URL, PRIVATE_KEY, AUCTION_ADDR, AUCTION_ABI } from "../../config/auction.config";
import { getAuctionID, buildAuctionCreatedReceipt, buildAuctionCreatedTx } from "./serialize"; // 路径按需调整
import { Contract, Signer, utils } from "ethers";
import { getSigner } from "../lib/signer"
import {
    CreateAuctionParams,
    PlaceBidParams,
    RevealBidParams,
    RevealLockParams,
    SubmitMatchResultsParams,
    WithdrawMatchResultParams,
} from "./type";


export function getAuctionContract(
    signer: Signer
): Contract {
    if (!AUCTION_ADDR.chainXAuction) {
        throw new Error("chainXAuctionV2Addr not set");
    }
    return new Contract(
        AUCTION_ADDR.chainXAuction,
        AUCTION_ABI.chainXAuction.abi,
        signer
    );
}

export async function createAuction(
    params: CreateAuctionParams
): Promise<{ auctionId: string; revealStartTime: bigint }> {
    const { seller, sourceChainId, activeAuctionCount, auctionType } = params;

    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const provider = signer.provider!;
    const nonce= await provider.getTransactionCount(signer.address);

    const chainId =
        sourceChainId ?? (await provider.getNetwork()).chainId;

    const auctionId = getAuctionID(
        seller,
        chainId,
        AUCTION_ADDR.chainYVault,
        activeAuctionCount
    );

    const rawTx  = await buildAuctionCreatedTx({
        nonce: nonce,
        gasPrice: utils.parseUnits("1", "gwei").toBigInt(),
        gasLimit: BigInt(52_200),
        to: AUCTION_ADDR.chainYVault,
        value: BigInt(0),
        chainId:chainId,
        data: "0x",
    });
    const signedTx = await signer.signTransaction(rawTx);
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

    const contract = getAuctionContract(signer);
    const tx = await contract.createAuction(crossChainMessage);
    await tx.wait();

    return { auctionId, revealStartTime };
}


export async function placeBid(
    params: PlaceBidParams
): Promise<{ bidValue: string; secretHash: string }> {
    const { auctionId, seller, valueEth, secretText = "secret" } = params;

    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const value = utils.parseEther(valueEth);
    const bidValue = utils.hexZeroPad(
        value.toHexString(),
        32
    );
    const secretHash = utils.keccak256(
        utils.toUtf8Bytes(secretText)
    );

    const depositAmount = value.mul(15).div(10);

    const tx = await contract.placeBid(
        auctionId,
        seller,
        secretHash,
        bidValue,
        { value: depositAmount }
    );
    await tx.wait();

    return { bidValue, secretHash };
}

export async function revealBid(
    params: RevealBidParams
): Promise<void> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const value = utils.parseEther(params.valueEth);
    const salt =
        params.saltHex ?? utils.randomBytes(32);

    const tx = await contract.revealBid(
        params.auctionId,
        value,
        salt
    );
    await tx.wait();
}

export async function revealLock(
    params: RevealLockParams
): Promise<void> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const value = utils.parseEther(params.valueEth);
    const salt = params.saltHex ?? utils.randomBytes(32);

    const tx = await contract.revealLock(
        params.auctionId,
        params.lockId,
        value,
        salt
    );
    await tx.wait();
}

export async function submitMatchResults(
    params: SubmitMatchResultsParams
): Promise<void> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const finalValues = params.finalValuesEth.map((v) =>
        utils.parseEther(v)
    );

    const tx = await contract.submitMatchResults(
        params.auctionId,
        params.lockIds,
        params.bidders,
        finalValues
    );
    await tx.wait();
}

export async function withdrawMatchResult(
    params: WithdrawMatchResultParams
): Promise<void> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const tx = await contract.withdrawMatchResult(
        params.auctionId,
        params.lockId
    );
    await tx.wait();
}

export async function getLockInfo(
    auctionId: string,
    lockId: string
): Promise<{ exists: boolean; revealTime: bigint; secret: string }> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const result = await contract.getLockInfo(auctionId, lockId);
    return {
        exists: result[0],
        revealTime: result[1].toBigInt(),
        secret: result[2],
    };
}

export async function getMatchResult(
    auctionId: string,
    bidder: string
): Promise<{ lockId: string; isChallenged: boolean; isWithdrawn: boolean }> {
    const signer = getSigner(RPC_URL, PRIVATE_KEY);
    const contract = getAuctionContract(signer);

    const result = await contract.getMatchResult(auctionId, bidder);
    return {
        lockId: result[0],
        isChallenged: result[1],
        isWithdrawn: result[2],
    };
}

