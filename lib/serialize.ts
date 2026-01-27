import { ethers } from "hardhat";
import { Wallet } from "ethers";


// event AuctionCreated(uint256 indexed auctionId, uint32 auctionType, uint256 activeAuctionCount, uint256 revealTime
interface auctionCreatedEvent {
    auctionId: string; // 使用string存储，auctionId是Keccak256计算的hash值，在调用合约时候会自动转化为uiny256
    auctionType: number;
    activeAuctionCount: bigint;
    revealTime: bigint;
    logAddress: string;
}


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
        event.logAddress,
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


// 使用私钥签名 legacy 交易，返回 rawTransaction（RLP 编码）
export async function buildAuctionCreatedTx(
    wallet: Wallet,
    nonce: number = 0,
    gasPrice: bigint = BigInt(0),
    gasLimit: bigint = BigInt(0),
    to: string = "0x",
    value: bigint = BigInt(0),
    data: string = "0x",
    chainId: number,
) {
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
    const signed = await wallet.signTransaction(tx);
    return signed;
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

    const rowReceipt = buildAuctionCreatedReceipt({ auctionId, auctionType, activeAuctionCount, revealTime, logAddress })
    console.log("rawReceipt:", rowReceipt);
}