import { ethers } from "hardhat";
import { BigNumberish } from "ethers";


// 构造 rawTx: legacy 格式 [nonce, gasPrice, gasLimit, to, value, data, v, r, s]
export function buildXTx(
    nonce: bigint,
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


export function buildXReceipt(
    chainId: number,
    activeAuctionCount: bigint,
    gasPrice: bigint,
    auctionId: string,
    auctionType: bigint,
    revealTime: bigint,
    logAddress: string,
) {

    const topic0 = ethers.utils.id("AuctionCreated(uint256,uint32,uint256,uint256)");
    const topic1 = auctionId;
    const eventData = ethers.utils.defaultAbiCoder.encode(
        ["uint32", "uint256", "uint256"],
        [auctionType, activeAuctionCount, revealTime]
    );

    const chainIdHex = ethers.utils.hexlify(chainId);
    const activeAuctionCountHex = ethers.utils.hexlify(activeAuctionCount);
    const gasPriceHex = ethers.utils.hexlify(gasPrice);

    // 事实上只需要log是合法的就可以
    const log = [
        logAddress,
        [topic0, topic1],
        ethers.utils.arrayify(eventData),
    ];
    const logBlob = ethers.utils.RLP.encode(log);

    return ethers.utils.RLP.encode([
        chainIdHex,
        activeAuctionCountHex,
        gasPriceHex,
        logBlob,
        "0x",
        "0x",               // value
        "0x",               // data
    ]);
}

// 根据 Auciton 所在合约的信息构造AuctionID
export function getAuctionID(seller: string, sourceChainId: number, vaultAddress: string, activeAuctionCount: number): string {
    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ["address", "uint256", "address", "uint256"],
            [seller, sourceChainId, vaultAddress, activeAuctionCount]
        )
    );
}

// 使用私钥签名 legacy 交易，返回 rawTransaction（RLP 编码）
export async function buildSignedTx(
    privateKey: string,
    to: string,
    value: bigint,
    data: string,
    gasPrice: bigint,
    gasLimit: bigint,
    nonce: bigint,
    chainId: number,
) {
    const provider = ethers.provider || new ethers.providers.JsonRpcProvider("http://localhost:8545");
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = {
        nonce,
        gasPrice,
        gasLimit,
        to,
        value,
        data,
        chainId,
        type: 0, // legacy
    };
    const signed = await wallet.signTransaction(tx);
    const parsed = ethers.utils.parseTransaction(signed);
    return { rawTx: signed, txHash: parsed.hash, from: parsed.from };
}

// 仅在直接运行本文件时演示生成 rawReceipt，避免被 require 时产生副作用
if (require.main === module) {
    const auctionType = BigInt(0x00000001);
    const sourceChainId = BigInt(31337);
    const seller = "0x5F40D0aA63957D41ec56500c5dc61c28Ae866a5e";
    const activeAuctionCount = BigInt(0);
    const gasPrice = BigInt(21000);
    const auctionId = getAuctionID(seller, sourceChainId, seller, activeAuctionCount);
    const revealTime = Math.floor(Date.now() / 1000) + 3600;
    const logAddress = "0x307833383843383138434138423932353162333933313331433038613733364136376363423139323937";


    // chainId: bigint,
    // activeAuctionCount: bigint,
    // gasPrice: bigint,
    // auctionId: string,
    // auctionType: string,
    // revealTime: bigint,
    // logAddress: string,


    const rowReceipt = buildXReceipt(sourceChainId, activeAuctionCount, gasPrice, auctionId, auctionType, revealTime, logAddress)
    console.log("rawReceipt:", rowReceipt);
}