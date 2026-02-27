import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

describe("MutiVoucher", function () {
    let mutiVoucher: Contract;
    let conversionRate = BigInt(1); // conversion rate for the voucher
    let addr1: any;
    let addr2: any;
    let voucherNameString="BitCoin";
    let voucherNameBytes32=ethers.utils.formatBytes32String(voucherNameString);
    let serviceNameString="Service";
    let serviceNameBytes=ethers.utils.formatBytes32String(serviceNameString);
    
    // before关键字只会执行一次，beforeEach会执行多次
    beforeEach(async function () {
        const MutiVoucher = await ethers.getContractFactory("MutiVoucher");
        mutiVoucher = await MutiVoucher.deploy();
        // 获取当前网络上所有账号，如果是punk要注意用户数量可能只有一个。
        [addr1, addr2] = await ethers.getSigners();
        await mutiVoucher.deployed();
        // console.log("voucher address:",mutiVoucher.address);
        await mutiVoucher.createVoucher(voucherNameBytes32, conversionRate);
        await mutiVoucher.addService(serviceNameBytes);
    });

    describe("Voucher manager",async function(){
        it("get info of voucher", async function () {
            // 查询代金券的汇率信息
            const rate = await mutiVoucher.getVoucherInfo(voucherNameBytes32);
            expect(rate).to.equal(conversionRate);
        });

        it("Should allow user to buy voucher", async function () {
            // 用户 addr1 使用 ETH 购买代金券
            const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
            await mutiVoucher.connect(addr1).buy(voucherNameBytes32, { value: buyAmount });
            // 检查用户余额是否正确增加
            const balance = await mutiVoucher.balanceOf(voucherNameBytes32, addr1.address);
            expect(balance).to.equal(buyAmount.mul(conversionRate));
        });

        it("Should not allow user to buy voucher with zero ETH", async function () {
            await expect(
                mutiVoucher.connect(addr1).buy(voucherNameBytes32, { value: 0 })
            ).to.be.revertedWith("Message value must be greater than zero");
        });

        it("Should allow user to use voucher", async function () {
            // 用户 addr1 使用 ETH 购买代金券
            const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
            await mutiVoucher.connect(addr1).buy(voucherNameBytes32, { value: buyAmount });
            // 使用代金券
            const useAmount = buyAmount.mul(conversionRate);
            await mutiVoucher.connect(addr1).use(voucherNameBytes32,serviceNameBytes ,useAmount);
            // 检查用户余额
            const balance = await mutiVoucher.balanceOf(voucherNameBytes32, addr1.address);
            expect(balance).to.equal(0);
        });

        it("Should not allow user to use more vouchers than they have", async function () {
            // 用户 addr1 使用 ETH 购买代金券
            const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
            await mutiVoucher.connect(addr1).buy(voucherNameBytes32, { value: buyAmount });
            // 用户试图使用超过拥有的代金券，应当失败
            const excessiveAmount = buyAmount.mul(conversionRate).add(1);
            await expect(
                mutiVoucher.connect(addr1).use(voucherNameBytes32, serviceNameBytes,excessiveAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should not create same voucher twice", async function () {
            await expect(
                mutiVoucher.createVoucher(voucherNameBytes32, 200)
            ).to.be.revertedWith("Voucher already exist");
        });

        it("Should get all voucher", async function () {
            await mutiVoucher.createVoucher(ethers.utils.formatBytes32String("V1"), 100);
            await mutiVoucher.createVoucher(ethers.utils.formatBytes32String("V2"), 200);
            await mutiVoucher.createVoucher(ethers.utils.formatBytes32String("V3"), 300);

            const vouchersBytes = await mutiVoucher.getAllVouchers();
            // console.log("vouchersBytes:", vouchersBytes);
            // 从Bytes32转化为string类型
            const vouchersStrings :string[]=vouchersBytes.map((v:any)=>{
                try {
                    return ethers.utils.parseBytes32String(v);
                } catch (err) {
                    console.error("解析失败:", v, err);
                    return ""; // 或者其他默认值
                }
            });
            // console.log("vouchersStrings:", vouchersStrings);

            expect(vouchersStrings).to.have.members([voucherNameString, "V1", "V2", "V3"]);
            expect(vouchersStrings.length).to.equal(4);
        });

        it("Should return correct balance for multiple users", async function () {
            // 用户 addr1 和 addr2 使用 ETH 购买代金券
            const buyAmount1 = ethers.utils.parseEther("1.0"); // 1 ETH
            const buyAmount2 = ethers.utils.parseEther("0.5"); // 0.5 ETH

            await mutiVoucher.connect(addr1).buy(voucherNameBytes32, { value: buyAmount1 });
            await mutiVoucher.connect(addr2).buy(voucherNameBytes32, { value: buyAmount2 });

            // 检查用户的余额
            const balance1 = await mutiVoucher.balanceOf(voucherNameBytes32, addr1.address);
            const balance2 = await mutiVoucher.balanceOf(voucherNameBytes32, addr2.address);

            const expectedAmount1 = buyAmount1.mul(conversionRate);
            const expectedAmount2 = buyAmount2.mul(conversionRate);

            expect(balance1).to.equal(expectedAmount1);
            expect(balance2).to.equal(expectedAmount2);
        });
    });

    describe("Service Management", function () {
        let serviceName2:string="Service2";
        let serviceName2Bytes:string;
        beforeEach(async function () {
            serviceName2Bytes=ethers.utils.formatBytes32String(serviceName2);
        });
        it("should allow user to add service", async function () {
            await mutiVoucher.addService(serviceName2Bytes);
            const isAvailable = await mutiVoucher.isServiceAvailable(serviceName2Bytes);
            expect(isAvailable).to.be.true;
        });

        it("should not allow user to add same service twice", async function () {
            await mutiVoucher.addService(serviceName2Bytes);
            await expect(
                mutiVoucher.addService(serviceName2Bytes)
            ).to.be.revertedWith("Service already exists");
        });

        it("should delete service", async function () {
            await mutiVoucher.addService(serviceName2Bytes);
            await mutiVoucher.deleteService(serviceName2Bytes);
            const isAvailable = await mutiVoucher.isServiceAvailable(serviceName2Bytes);
            expect(isAvailable).to.be.false;
        });

        it("should get all services",async function () {
            await mutiVoucher.addService(serviceName2Bytes);
            const servicesBytes = await mutiVoucher.getAllServices();
            expect(servicesBytes).to.include.members([serviceName2Bytes, serviceNameBytes]);
        });
    });
});
