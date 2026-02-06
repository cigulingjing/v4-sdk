import { ethers } from "ethers";
import { Wallet } from "ethers";
import { MatchResultWithdrawnEvent,auctionCreatedEvent} from "./event";
import { utils } from "ethers";
import { AUCTION_ADDR } from "../../config/auction.config";


export function buildAuctionCreatedReceipt(
    event: auctionCreatedEvent,
    status: number = 0x01,
    gasUsed: bigint = BigInt(0),
    gasPrice: bigint = BigInt(0),
) {
    // * 随意填写的数据
    const statusHex = ethers.utils.hexlify(status);
    const gasUsedHex = ethers.utils.hexlify(gasUsed);
    const gasPriceHex = ethers.utils.hexlify(gasPrice);

    // 构造Event，实际上只需要Event字段是合法的就可以，并且确保在数组的index=3.
    const topic0 = ethers.utils.id("AuctionCreated(uint256,uint32,uint256,uint256)");
    const topic1 = event.auctionId;
    const eventData = ethers.utils.defaultAbiCoder.encode(
        ["uint32", "uint256", "uint256"],
        [event.auctionType, event.activeAuctionCount, event.revealTime]
    );
    const log = [
        AUCTION_ADDR.chainYVault,
        [topic0, topic1],
        ethers.utils.arrayify(eventData),
    ];
    const logBlob = ethers.utils.RLP.encode(log);

    // recipt每个元素必须都是 Hex-string
    const receipt = [statusHex, gasUsedHex, gasPriceHex, logBlob];
    return ethers.utils.RLP.encode(receipt);
}

// 根据 Auciton 所在合约的信息构造AuctionID
export function getAuctionID(seller: string, sourceChainId: number, vaultAddress: string, activeAuctionCount: bigint): string {
    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ["address", "uint256", "address", "uint256"],
            [seller, sourceChainId, vaultAddress, activeAuctionCount]
        )
    );
}

// 构造 rawTx: legacy 格式 [nonce, gasPrice, gasLimit, to, value, data, v, r, s]
export function buildXTx(
    nonce: number,
    gasPrice: bigint,
    gasLimit: bigint,
    to: string,
    value: bigint,
    data: string,
    v: bigint,
    r: string,
    s: string,
) {
    return ethers.utils.RLP.encode([
        nonce,
        gasPrice,
        gasLimit,
        to,
        value,
        ethers.utils.arrayify(data),
        v,
        ethers.utils.zeroPad(ethers.utils.arrayify(r), 32),
        ethers.utils.zeroPad(ethers.utils.arrayify(s), 32),
    ]);
}


interface BuildAuctionCreatedTxParams {
    nonce?: number;
    gasPrice?: bigint;
    gasLimit?: bigint;
    to?: string;
    value?: bigint;
    data?: string;
    chainId?: number;
}

export async function buildAuctionCreatedTx({
    nonce = 0,
    gasPrice = BigInt(0),
    gasLimit = BigInt(0),
    to = "0x",
    value = BigInt(0),
    data = "0x",
    chainId=31337,
}: BuildAuctionCreatedTxParams
){
    const tx = {
        nonce,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        chainId,
        type: 0, // Legacy tx
    };
    return tx
}


/**
 * 构造 Unlock Receipt（RLP）
 */
export function buildChainXUnlockReceipt({
    auctionId,
    lockId,
    recipient,
    amount,
}: MatchResultWithdrawnEvent): string {
    const status = "0x01";
    const cumulativeGasUsed = "0x00";
    const logsBloom = "0x" + "00".repeat(256);
    const logAddress = AUCTION_ADDR.chainXAuction;

    const topic0 = utils.id(
        "MatchResultWithdrawn(uint256,bytes32,address,uint256)"
    );

    const eventData = utils.defaultAbiCoder.encode(
        ["uint256", "bytes32", "address", "uint256"],
        [auctionId, lockId, recipient, amount]
    );

    const log = [
        logAddress,
        [topic0],
        utils.arrayify(eventData),
    ];

    const logBlob = utils.RLP.encode(log);
    return utils.RLP.encode([
        status,
        cumulativeGasUsed,
        logsBloom,
        logBlob,
    ]);
}

// 仅在直接运行本文件时演示生成 rawReceipt，避免被 require 时产生副作用
if (require.main === module) {
    const stauts = 0x01;
    const gasUsed = BigInt(21000);
    const gasPrice = BigInt(21000);
    const sourceChainId = 11223344;

    const auctionType = 0x00000001;
    const seller = "0x5F40D0aA63957D41ec56500c5dc61c28Ae866a5e";
    const activeAuctionCount = BigInt(0);
    const auctionId = getAuctionID(seller, sourceChainId, seller, activeAuctionCount);
    const revealTime = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const logAddress = "0x307833383843383138434138423932353162333933313331433038613733364136376363423139323937";

    const rowReceipt = buildAuctionCreatedReceipt({ auctionId, auctionType, activeAuctionCount, revealTime })
    console.log("rawReceipt:", rowReceipt);
}