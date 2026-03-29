import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { ChainYVaultClient, toWei } from "../../src/auction/vault";

function buildUnlockReceipt(
    auctionId: BigNumber,
    lockId: string,
    recipient: string,
    amount: BigNumber
): string {
    const status = "0x01";
    const cumulativeGasUsed = "0x00";
    const logsBloom = "0x" + "00".repeat(256);
    const topic0 = ethers.utils.id(
        "MatchResultWithdrawn(uint256,bytes32,address,uint256)"
    );
    const eventData = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "bytes32", "address", "uint256"],
        [auctionId, lockId, recipient, amount]
    );
    const log = [
        ethers.constants.AddressZero,
        [topic0],
        ethers.utils.arrayify(eventData),
    ];
    const logBlob = ethers.utils.RLP.encode(log);
    return ethers.utils.RLP.encode([
        status,
        cumulativeGasUsed,
        logsBloom,
        logBlob,
    ]);
}

describe("ChainYVault SDK", function () {
    let vault: Contract;
    let client: ChainYVaultClient;
    let owner: any;
    let recipient: any;

    beforeEach(async function () {
        [owner, recipient] = await ethers.getSigners();
        const VaultFactory = await ethers.getContractFactory("ChainYVaultV2");
        vault = await VaultFactory.deploy(ethers.constants.AddressZero);
        await vault.deployed();

        const abi = vault.interface.format(ethers.utils.FormatTypes.json) as string;
        client = new ChainYVaultClient({
            contractAddress: vault.address,
            contractAbi: abi,
            signer: owner,
        });
    });

    it("createAuctionConfig stores config", async function () {
        const txHash = await client.createAuctionConfig({
            auctionType: 0x00000001,
            baseAmountEth: "1.0",
            extendSeconds: 3600,
        });

        expect(txHash).to.match(/^0x[0-9a-fA-F]{64}$/);
        const count = await vault.getActiveConfigsCount();
        expect(count.toNumber()).to.equal(1);
    });

    it("createAuction returns auctionId and lockId", async function () {
        await client.createAuctionConfig({
            auctionType: 0x00000001,
            baseAmountEth: "1.0",
            extendSeconds: 3600,
        });

        const result = await client.createAuction({
            configId: 0,
            secretText: "secret",
            expirationTs: Math.floor(Date.now() / 1000) + 3600,
            amountEth: "1.0",
        });

        expect(result.txHash).to.match(/^0x[0-9a-fA-F]{64}$/);
        console.log("auctionId:", result.auctionId);
        expect(result.auctionId).to.exist;
        expect(result.lockId).to.exist;

        const auctionId = BigNumber.from(result.auctionId as any);
        const info = await client.getAuctionInfo(auctionId.toString());
        expect(info.baseAmount).to.equal(toWei("1.0"));
    });

    it("unlockTokens releases locked funds", async function () {
        await client.createAuctionConfig({
            auctionType: 0x00000001,
            baseAmountEth: "1.0",
            extendSeconds: 3600,
        });

        const created = await client.createAuction({
            configId: 0,
            secretText: "secret",
            expirationTs: Math.floor(Date.now() / 1000) + 3600,
            amountEth: "1.0",
        });

        const auctionId = BigNumber.from(created.auctionId as any);
        const lockId = created.lockId as string;
        const unlockAmount = ethers.utils.parseEther("1.0");
        const rawReceipt = buildUnlockReceipt(
            auctionId,
            lockId,
            recipient.address,
            unlockAmount
        );

        await client.unlockTokens({ lockId, rawReceipt });

        const lockInfo = await client.getAuctionLockInfo(lockId);
        expect(lockInfo.isLocked).to.equal(false);
    });
});
