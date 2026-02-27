import { Contract, Wallet, providers,utils } from "ethers";

import { MUTI_VOUCHER_ADDR,MUTI_VOUCHER_ABI } from "../config/voucher.config";
import { BuildUseVoucherTx } from "../src/voucher";
import { PUNK_RPC_URL,PUNK_PRIVATE_KEY } from "../config/env.config";
import { expect } from "chai";

describe("punk链测试", async function () {
    let mutiVoucher: Contract;
    let conversionRate = BigInt(1); // conversion rate for the voucher
    let account1: Wallet;
    let account1Address:string;
    let voucherName: string;
    let voucherBytes32:string;
    let serviceName: string;
    let serviceBytes32:string;

    before(async function () {
        // 直接连接到已部署的合约   
        const provider = new providers.JsonRpcProvider(PUNK_RPC_URL);
        account1 = new Wallet(PUNK_PRIVATE_KEY, provider);
        mutiVoucher = new Contract(MUTI_VOUCHER_ADDR,MUTI_VOUCHER_ABI.abi, account1);
        
        voucherName = "ETH";
        voucherBytes32=utils.formatBytes32String(voucherName);
        serviceName = "testService";
        serviceBytes32=utils.formatBytes32String(serviceName);

        let isVoucherExist:boolean = await mutiVoucher.isVoucherExist(voucherBytes32);
        if (!isVoucherExist) {
            await mutiVoucher.createVoucher(voucherBytes32, conversionRate);
            isVoucherExist=await mutiVoucher.isVoucherExist(voucherBytes32)
            if (!isVoucherExist) {
                throw new Error("Failed to create voucher");
            }else{
                console.log(`Voucher ${voucherName} created with conversion rate ${conversionRate}`);
            }
        }
        if (!await mutiVoucher.isServiceAvailable(serviceBytes32)){ 
            console.log(`Service ${serviceName} added`);
            // if not exist, createVoucher
            await mutiVoucher.addService(serviceBytes32);
        }
    });
   

    it("Should allow user to use voucher", async function () {
        // 用户 addr1 使用 ETH 购买代金券
        const buyAmount = utils.parseEther("1"); // 1 ETH
        console.log("buyAmount:", buyAmount.toString());
        await mutiVoucher.connect(account1).buy(voucherBytes32, { value: buyAmount });

    //     // populateTransaction 为可发送的交易请求对象
    //     // const useAmount = buyAmount.mul(conversionRate);
    //     // const txRequest = await mutiVoucher.populateTransaction.use(
    //     //     voucherName,
    //     //     useAmount
    //     // );

        // 普通转账类型
        const txRequest = {
            to: account1.address,
            value: utils.parseEther("0.0001"),
            gasLimit:1100000, // 主动设置gas
        };

        const customTx = BuildUseVoucherTx(txRequest, voucherBytes32, serviceBytes32);
        const Oldbalance = await mutiVoucher.balanceOf(voucherBytes32, account1.address);
        const sent = await account1.sendTransaction(customTx);
        await sent.wait();
        const balance = await mutiVoucher.balanceOf(voucherBytes32, account1.address);
        console.log("Oldbalance:", Oldbalance);
        console.log("balance:", balance)
    });

});