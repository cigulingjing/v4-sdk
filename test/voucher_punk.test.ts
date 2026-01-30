import { ethers } from "hardhat";
import { Contract, Wallet } from "ethers";
import { MUTI_VOUCHER_ADDR } from "../config/voucher.config";
import { BuildUseVoucherTx } from "../src/voucher";
import { RPC_URL, PRIVATE_KEY, ACCOUNT_ADDR } from "../config/env.config";
import { getSigner } from "../src/lib/signer";
import { expect } from "chai";

describe("punk链测试", async function () {
    let mutiVoucher: Contract;
    let conversionRate = BigInt(1); // conversion rate for the voucher
    let account1: Wallet;
    let account1Address:string;
    let voucherName: string;
    let voucherBytes32:string;

    before(async function () {
        // 直接连接到已部署的合约   
        const MutiVoucher = await ethers.getContractFactory("MutiVoucher");
        mutiVoucher = await MutiVoucher.attach(MUTI_VOUCHER_ADDR);
        account1 = getSigner(RPC_URL, PRIVATE_KEY);
        account1Address = ACCOUNT_ADDR;

        voucherName = "ETH";
        voucherBytes32=ethers.utils.formatBytes32String(voucherName);
        // await mutiVoucher.createVoucher(voucherBytes32, conversionRate);
    });
    it("should show all voucher",async function(){

        const vouchersBytes = await mutiVoucher.getAllVouchers();
        console.log("vouchersBytes:", vouchersBytes);
        // 从Bytes32转化为string类型
        const vouchersStrings :string[]=vouchersBytes.map((v:any)=>{
            try {
                return ethers.utils.parseBytes32String(v);
            } catch (err) {
                console.error("解析失败:", v, err);
                return ""; // 或者其他默认值
            }
        });
        

        console.log("vouchersStrings:", vouchersStrings);
    });

    it("Should allow user to buy voucher", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
        await mutiVoucher.connect(account1).buy(voucherBytes32, { value: buyAmount });
        // 检查用户余额是否正确增加
        const balance = await mutiVoucher.balanceOf(voucherBytes32, account1Address);
        console.log("balance:", balance)

    });

    it("Should allow user to use voucher", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = ethers.utils.parseEther("1.0"); // 1 ETH
        await mutiVoucher.connect(account1).buy(voucherBytes32, { value: buyAmount });

        const useAmount = buyAmount.mul(conversionRate);
        // populateTransaction 为可发送的交易请求对象
        // const txRequest = await mutiVoucher.populateTransaction.use(
        //     voucherName,
        //     useAmount
        // );

        // 普通转账类型
        const txRequest = {
            to: account1Address,
            value: ethers.utils.parseEther("0.1"),
            data: "0x", // 普通转账可省略
        };

        const customTx = BuildUseVoucherTx(txRequest, voucherBytes32);
        const Oldbalance = await mutiVoucher.balanceOf(voucherBytes32, account1Address);
        const sent = await account1.sendTransaction(customTx);
        await sent.wait();
        const balance = await mutiVoucher.balanceOf(voucherBytes32, account1Address);
        console.log("Oldbalance:", Oldbalance);
        console.log("balance:", balance)
    });
});