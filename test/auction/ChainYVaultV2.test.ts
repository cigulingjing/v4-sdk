import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("ChainYVaultV2", function () {
    let chainYVault: Contract;
    let owner: any;
    let seller: any;
    let mockStrategy: Contract;

    // 测试数据
    const auctionType = 0x00000001; // 普通公开竞标
    const baseAmount = ethers.utils.parseEther("1.0");

    beforeEach(async function () {
        [owner, seller] = await ethers.getSigners();
        console.log("signers: ", owner.address, seller.address);

        // 部署合约
        const ChainYVaultV2 = await ethers.getContractFactory("ChainYVaultV2");
        // Coinbase地址设置为0,用作本地测试.
        chainYVault = await ChainYVaultV2.deploy(ethers.constants.AddressZero);
        await chainYVault.deployed();
        console.log("chainYVault: ", chainYVault.address);

        // 部署模拟解锁策略合约
        // const MockUnlockStrategy = await ethers.getContractFactory(
        //     "MatchResultWithdrawnStrategy"
        // );
        // mockStrategy = await MockUnlockStrategy.deploy();

        // 设置解锁策略
        // await chainYVault.setUnlockStrategy(auctionType, mockStrategy.address);
    });

    describe("竞拍配置管理", function () {
        it("应该正确创建竞拍配置", async function () {
            await chainYVault.createAuctionConfig(
                auctionType,
                baseAmount,
                86400 // 1天的扩展时间
            );

            const config = await chainYVault.auctionConfigs(0);
            expect(config.auctionType).to.equal(auctionType);
            expect(config.baseAmount).to.equal(baseAmount);
            expect(config.isActive).to.be.true;
        });

        it("只有管理员可以创建竞拍配置", async function () {
            await expect(
                chainYVault.connect(seller).createAuctionConfig(
                    auctionType,
                    baseAmount,
                    86400
                )
            )
                .to.be.revertedWithCustomError(
                    chainYVault,
                    "OwnableUnauthorizedAccount"
                )
                .withArgs(seller.address);
            // * 另一种写法
            // try {
            //     await chainYVault.connect(seller).createAuctionConfig(auctionType, baseAmount, 86400);
            // } catch (err) {
            //     console.log("errorName:", err.errorName);          // OwnableUnauthorizedAccount
            //     console.log("errorSignature:", err.errorSignature); // OwnableUnauthorizedAccount(address)
            //     console.log("args:", err.args);                     // [seller.address]
            // }
        });
    });

    describe("竞拍创建与锁定", function () {
        beforeEach(async function () {
            await chainYVault.createAuctionConfig(auctionType, baseAmount, 86400);
        });

        it("应该正确创建竞拍并锁定资金", async function () {
            const hashSecret = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("secret")
            );
            const expiration = Math.floor(Date.now() / 1000) + 3600; // 1小时后

            const tx = await chainYVault.connect(seller).createAuction(
                0, // configId
                hashSecret,
                expiration,
                { value: baseAmount }
            );

            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e: any) => e.event === "AuctionCreated"
            );

            expect(event).to.not.be.undefined;

            const auctionId = event.args.auctionId;
            const auction = await chainYVault.auctions(auctionId);
            expect(auction.auctionType).to.equal(auctionType);
            expect(auction.baseAmount).to.equal(baseAmount);
        });

        it("应该验证锁定金额是基础金额的整数倍", async function () {
            const hashSecret = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("secret")
            );
            const expiration = Math.floor(Date.now() / 1000) + 3600;

            await expect(
                chainYVault.connect(seller).createAuction(
                    0,
                    hashSecret,
                    expiration,
                    { value: baseAmount.add(1) } // 非整数倍金额
                )
            ).to.be.revertedWith("Amount must be multiple of baseAmount");
        });
    });

    describe("解锁流程", function () {
        let lockId: string;

        beforeEach(async function () {
            // 创建竞拍并锁定资金
            await chainYVault.createAuctionConfig(auctionType, baseAmount, 86400);

            const hashSecret = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("secret")
            );
            const expiration = Math.floor(Date.now() / 1000) + 3600;

            const tx = await chainYVault.connect(seller).createAuction(
                0,
                hashSecret,
                expiration,
                { value: baseAmount }
            );

            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e: any) => e.event === "TokensLocked"
            );
            lockId = event.args.lockId;
        });

        it("应该正确解锁资金", async function () {
            // 构造模拟收据
            const mockReceipt =
                "0xf9016f833078318312d687825208b8d1f8cfaa307833383843383138434138423932353162333933313331433038613733364136376363423139323937e1a02f098022e2dd8f759370794b8abd98fb76df4b14f2f8680cc897dea22debc029b8800a57ee3a1381880626494e291d6b330ee30954940f1d95b3550123c731b71e4b2ec29a81be0bc2b26da13786533941314bd380b6021b34e0b26fec154828521300000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c800000000000000000000000000000000000000000000000000000000000003e88080800184014ed444b842307864383461663130646364393836633330336435323162386630303031333739383634313931366364613132306166316666343834323839613863316162353663b842307834363864313534386536366464623534626665356535346335306639663237643231663134323930303932363935313538623931343534393833333131633431";
            // const mockReceipt = ethers.utils.encodeRlp([]);

            const balanceBefore = await ethers.provider.getBalance(seller.address);
            console.log("balanceBefore:", balanceBefore.toString());

            const tx = await chainYVault
                .connect(seller)
                .unlockTokens(lockId, mockReceipt);
            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e: any) => e.event == "TokensUnlocked"
            );

            console.log("event:", event.args);
            // 下述expect断言验证参数都是在mockReceipt封装的。可以利用scripts/rlp.js解析查看细节
            expect(event.args.lockId).to.equal(lockId);
            expect(event.args.recipient).to.equal(
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
            );
            expect(event.args.amount).to.equal(ethers.utils.hexlify(1000));

            const balanceAfter = await ethers.provider.getBalance(seller.address);
            console.log("balanceAfter:", balanceAfter.toString());

            // * 利用余额判断是否执行，但是gas费会影响结果，不太准确
            // expect(balanceAfter - balanceBefore).to.be.closeTo(
            //     baseAmount,
            //     ethers.utils.parseEther("0.01") // 考虑gas费用的误差
            // );
        });
    });
});