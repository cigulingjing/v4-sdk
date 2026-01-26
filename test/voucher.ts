import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";


describe("MutiVoucher", function () {
    let mutiVoucher: Contract;
    let conversionRate = BigInt(2); // conversion rate for the voucher
    let addr1: any;
    let addr2: any;
    beforeEach(async function () {
        const MutiVoucher = await ethers.getContractFactory("MutiVoucher");
        mutiVoucher = await MutiVoucher.deploy();
        [addr1, addr2] = await ethers.getSigners();
        await mutiVoucher.deployed();

        await mutiVoucher.createVoucher("Voucher1", conversionRate);
    });

    it("get info of voucher", async function () {
        // 查询代金券的汇率信息
        const rate = await mutiVoucher.getVoucherInfo("Voucher1");
        console.log("rate:", rate);
        expect(rate).to.equal(conversionRate);
    });

    it("Should allow user to buy voucher", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
        await mutiVoucher.connect(addr1).buy("Voucher1", { value: buyAmount });

        // 检查用户余额是否正确增加
        const balance = await mutiVoucher.balanceOf("Voucher1", addr1.address);

        console.log("balance:", balance)

    });

    it("Should not allow user to buy voucher with zero ETH", async function () {
        await expect(
            mutiVoucher.connect(addr1).buy("Voucher1", { value: 0 })
        ).to.be.revertedWith("Message value must be greater than zero");
    });

    it("Should allow user to use voucher", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
        await mutiVoucher.connect(addr1).buy("Voucher1", { value: buyAmount });
        // 使用代金券
        const useAmount = buyAmount.mul(conversionRate);
        await mutiVoucher.connect(addr1).use("Voucher1", useAmount);
        // 检查用户余额
        const balance = await mutiVoucher.balanceOf("Voucher1", addr1.address);
        expect(balance).to.equal(0);
    });

    it("Should not allow user to use more vouchers than they have", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
        await mutiVoucher.connect(addr1).buy("Voucher1", { value: buyAmount });
        // 用户试图使用超过拥有的代金券，应当失败
        const excessiveAmount = buyAmount.mul(conversionRate).add(1);
        await expect(
            mutiVoucher.connect(addr1).use("Voucher1", excessiveAmount)
        ).to.be.revertedWith("Insufficient balance");
    });

    it("Should not create same voucher twice", async function () {
        await expect(
            mutiVoucher.createVoucher("Voucher1", 200)
        ).to.be.revertedWith("Voucher already exist");
    });

    it("Should get all voucher", async function () {
        await mutiVoucher.createVoucher("V1", 100);
        await mutiVoucher.createVoucher("V2", 200);
        await mutiVoucher.createVoucher("V3", 300);

        const vouchers = await mutiVoucher.getAllVouchers();
        expect(vouchers).to.have.members(["Voucher1", "V1", "V2", "V3"]);
        expect(vouchers.length).to.equal(4);
    });

    it("Should return correct balance for multiple users", async function () {
        // 用户 addr1 和 addr2 使用 ETH 购买代金券
        const buyAmount1 = ethers.utils.parseEther("1.0"); // 1 ETH
        const buyAmount2 = ethers.utils.parseEther("0.5"); // 0.5 ETH

        await mutiVoucher.connect(addr1).buy("Voucher1", { value: buyAmount1 });
        await mutiVoucher.connect(addr2).buy("Voucher1", { value: buyAmount2 });

        // 检查用户的余额
        const balance1 = await mutiVoucher.balanceOf("Voucher1", addr1.address);
        const balance2 = await mutiVoucher.balanceOf("Voucher1", addr2.address);

        const expectedAmount1 = buyAmount1.mul(conversionRate);
        const expectedAmount2 = buyAmount2.mul(conversionRate);

        expect(balance1).to.equal(expectedAmount1);
        expect(balance2).to.equal(expectedAmount2);
    });
});