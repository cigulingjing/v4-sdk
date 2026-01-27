
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { getAuctionID, buildAuctionCreatedReceipt, buildAuctionCreatedTx } from "../../lib/serialize";

import { expect } from "chai";
import { ethers, network } from "hardhat";
import type { Contract, Wallet } from "ethers";

describe("ChainXAuctionV2", function () {
    let chainXAuction: Contract;
    let owner: any;
    let seller: any;
    let sellerWallet: Wallet;
    let bidder1: any;
    let bidder2: any;
    let vaultAddress: string;

    // 测试数据
    const auctionType = 0x00000001;
    const sourceChainId = 31337;
    const activeAuctionsCount = BigInt(0);
    const gasPrice = ethers.utils.parseUnits("1", "gwei").toBigInt();
    const gasLimit = BigInt(52_200);

    beforeEach(async function () {
        [owner, bidder1, bidder2] = await ethers.getSigners();
        seller = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        let sellerPk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        sellerWallet = new ethers.Wallet(sellerPk);
        
        vaultAddress = "0x59b670e9fA9D0A427751Af201D676719a970857b";

        const ChainXAuctionV2 = await ethers.getContractFactory("ChainXAuctionV2");
        chainXAuction = await ChainXAuctionV2.deploy(vaultAddress);
        await chainXAuction.deployed();
    });

    describe("拍卖创建", function () {
        it("应该正确创建拍卖", async function () {
            const nonce = await ethers.provider.getTransactionCount(seller);
            const latestTs = (await ethers.provider.getBlock("latest")).timestamp;
            const revealStartTime = latestTs + 1;

            const auctionId: string = getAuctionID(seller, sourceChainId, vaultAddress, activeAuctionsCount);

            // 构造链Y的createAuciton交易sellerWallet
            const rawTx = await buildAuctionCreatedTx(sellerWallet, sourceChainId);

            const parsedTx = ethers.utils.parseTransaction(rawTx);
            console.log("parsed from:", parsedTx.from, "v:", parsedTx.v, "chainId:", parsedTx.chainId,"txHash:",parsedTx.hash);

            const debug = await chainXAuction.debugRecover(rawTx);
            console.log(
                "debug signer", debug[0],
                "txHash", debug[1],
                "chainIdSig", debug[2].toString(),
                "vAdj", debug[3],
                "nonce", debug[4].toString(),
                "gasPrice", debug[5].toString(),
                "gasLimit", debug[6].toString(),
                "value", debug[7].toString(),
            );


            // 构造Tx对应的Receipt
            const logAddress = "0x3078333838433831384341384239323531623339";
            const rawRecpt = buildAuctionCreatedReceipt({
                auctionId,
                auctionType: Number(auctionType),
                activeAuctionCount: BigInt(activeAuctionsCount),
                revealTime: BigInt(revealStartTime),
                logAddress
            });

            const crossChainMessage = ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint256 sourceChainId, bytes rawTransaction, bytes rawRecpt)"],
                [[sourceChainId, rawTx, rawRecpt]]
            );

            await expect(chainXAuction.createAuction(crossChainMessage))
                .to.emit(chainXAuction, "AuctionCreated")
                .withArgs(auctionId, auctionType, anyValue);
        });
    });

    describe("投标流程", function () {
        let auctionId: string;

        beforeEach(async function () {
            const nonce = await ethers.provider.getTransactionCount(seller);
            const latestTs = (await ethers.provider.getBlock("latest")).timestamp;
            const revealTime = BigInt(latestTs + 1);
            let activeAuctionCount = BigInt(0);
            auctionId = getAuctionID(seller, sourceChainId, vaultAddress, activeAuctionCount);

            const { rawTx } = await buildAuctionCreatedTx(sellerWallet,sourceChainId);
            const logAddress = "0x307833383843383138434138423932353162333933313331433038613733364136376363423139323937";
            const rawRecpt = buildAuctionCreatedReceipt({ auctionId, auctionType, activeAuctionCount, revealTime, logAddress });
            const crossChainMessage = ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint256 sourceChainId, bytes rawTransaction, bytes rawRecpt)"],
                [[sourceChainId, rawTx, rawRecpt]]
            );
            await chainXAuction.createAuction(crossChainMessage);
        });

        it("应该正确提交投标和揭示", async function () {
            // 准备投标数据
            const value = ethers.utils.parseEther("1.0");
            const salt = ethers.utils.randomBytes(32);

            // 公开竞价
            const bidValue = ethers.utils.hexZeroPad(value.toHexString(), 32);

            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
            const depositAmount = ethers.utils.parseEther("1.5");

            // 提交投标
            await expect(
                chainXAuction.connect(bidder1).placeBid(
                    auctionId,
                    seller,
                    secretHash,
                    bidValue,
                    { value: depositAmount }
                )
            ).to.emit(chainXAuction, "BidPlaced")
                .withArgs(auctionId, anyValue, bidder1.address, depositAmount);

            // 等待揭示期
            await network.provider.send("evm_increaseTime", [3600]);
            await network.provider.send("evm_mine");

            await expect(
                chainXAuction.connect(bidder1).revealBid(
                    auctionId,
                    value,
                    salt
                )
            ).to.emit(chainXAuction, "BidRevealed")
                .withArgs(auctionId, bidder1.address, value);
        });
    });

    describe("匹配结果管理", function () {
        let auctionId: string;
        let lockId: bigint;

        beforeEach(async function () {
            const latestTs = (await ethers.provider.getBlock("latest")).timestamp;
            const revealTime = BigInt(latestTs + 1);
            const activeAuctionCount = BigInt(0);

            auctionId = getAuctionID(seller, sourceChainId, vaultAddress, activeAuctionCount);

            const { rawTx } = await buildAuctionCreatedTx(sellerWallet,sourceChainId);
            const logAddress = "0x307833383843383138434138423932353162333933313331433038613733364136376363423139323937";
            const rawRecpt = buildAuctionCreatedReceipt({
                auctionId,
                auctionType,
                activeAuctionCount,
                revealTime,
                logAddress,
            });

            const crossChainMessage = ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint256 sourceChainId, bytes rawTransaction, bytes rawRecpt)"],
                [[sourceChainId, rawTx, rawRecpt]]
            );

            await chainXAuction.createAuction(crossChainMessage);

            // place one bid to create a lockId
            const value = ethers.utils.parseEther("1.0");
            const salt = ethers.utils.randomBytes(32);
            const bidValue = ethers.utils.hexZeroPad(value.toHexString(), 32);
            const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("secret"));
            const depositAmount = ethers.utils.parseEther("1.5");

            await chainXAuction.connect(bidder1).placeBid(
                auctionId,
                seller,
                secretHash,
                bidValue,
                { value: depositAmount }
            );

            let lockhash = ethers.utils.keccak256(
                ethers.utils.solidityPack(
                    ["uint256", "address", "uint256", "address", "bytes32", "uint32"],
                    [sourceChainId, vaultAddress, auctionId, seller, secretHash, auctionType]
                )
            );
            lockId = BigInt(lockhash);

            // fast-forward beyond reveal + bid periods so submitMatchResults is allowed
            await network.provider.send("evm_increaseTime", [7200]);
            await network.provider.send("evm_mine");
        });

        it("应该正确提交匹配结果", async function () {
            const lockIds = [lockId];
            const bidders = [await bidder1.address];
            const finalValues = [ethers.utils.parseEther("1.0")];

            await expect(
                chainXAuction.submitMatchResults(
                    auctionId,
                    lockIds,
                    bidders,
                    finalValues
                )
            ).to.emit(chainXAuction, "MatchResultSubmitted")
                .withArgs(auctionId, lockId, await bidder1.address, finalValues[0]);
        });

        it("应该允许挑战匹配结果", async function () {
            const lockIds = [lockId];
            const bidders = [await bidder1.address];
            const finalValues = [ethers.utils.parseEther("1.0")];

            await chainXAuction.submitMatchResults(
                auctionId,
                lockIds,
                bidders,
                finalValues
            );

            await expect(
                chainXAuction.connect(bidder2).challengeMatchResult(
                    auctionId,
                    await bidder1.address
                )
            ).to.emit(chainXAuction, "MatchResultChallenged")
                .withArgs(auctionId, lockId, await bidder2.address, "");
        });

        it("应该正确处理提现请求", async function () {
            const lockIds = [lockId];
            const bidders = [await bidder1.address];
            const finalValues = [ethers.utils.parseEther("1.0")];

            await chainXAuction.submitMatchResults(
                auctionId,
                lockIds,
                bidders,
                finalValues
            );

            // fast-forward beyond challenge period (secret + bid + challenge = 3h)
            await network.provider.send("evm_increaseTime", [3 * 3600 + 60]);
            await network.provider.send("evm_mine");

            await expect(
                chainXAuction.connect(bidder1).withdrawMatchResult(
                    auctionId,
                    lockId
                )
            ).to.emit(chainXAuction, "MatchResultWithdrawn")
                .withArgs(auctionId, lockId, vaultAddress, anyValue);
        });
    });
}); 