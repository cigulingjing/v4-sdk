
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { getAuctionID, buildAuctionCreatedReceipt, buildAuctionCreatedTx } from "../../src/auction/serialize";


import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract, Wallet, Transaction, ContractTransaction, ContractReceipt } from "ethers";


interface AuctionValue{
    value: bigint;
    salt: string;
    hashSecret: string;
}

describe("auction", function () {
    let chainXAuction: Contract;
    let chainYVault:Contract;
    let coinBase:Contract;

    let owner: any;
    let seller: any;
    let sellerWallet: Wallet;
    let bidder1: any;
    let bidder2: any;
    let configId: bigint = BigInt(0);
    let abiCoder=new ethers.utils.AbiCoder();

    let auctionValue={
        value: BigInt(100),
        salt:ethers.utils.hexZeroPad("0x1234", 32),
        hashSecret: ethers.utils.solidityKeccak256(
            ["uint256", "bytes32"],
            [BigInt(100), ethers.utils.hexZeroPad("0x1234", 32)]
        )
    };

    // 测试数据
    const auctionType = 0x00000000; // 密封竞标
    const baseAmount = ethers.utils.parseEther("1.0");

    const chainXId = 31337;
    const chainYId = 22445;

    const gasPrice = ethers.utils.parseUnits("1", "gwei").toBigInt();
    const gasLimit = BigInt(52_200);

    

    beforeEach(async function () {
        [owner, bidder1, bidder2] = await ethers.getSigners();
        seller = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        let sellerPk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        sellerWallet = new ethers.Wallet(sellerPk);
        
        const coinBaseFactory=await ethers.getContractFactory("CoinBase");
        coinBase=await coinBaseFactory.deploy();
        await coinBase.deployed();


        const ChainYVaultFactory=await ethers.getContractFactory("ChainYVaultV2");
        chainYVault=await ChainYVaultFactory.deploy(coinBase.address);
        await chainYVault.deployed();


        const ChainXAuctionV2 = await ethers.getContractFactory("ChainXAuctionV2");
        chainXAuction = await ChainXAuctionV2.deploy(chainYVault.address);
        await chainXAuction.deployed();
    });

    describe("punk链(Y链) 创建拍卖配置", function () {


        it ("创建拍卖配置",async function(){
            configId =  await chainYVault.getActiveConfigsCount();
            await chainYVault.createAuctionConfig(
                auctionType,
                baseAmount,
                86400 // 1天的扩展时间
            );
        });

        it ("Y链创建拍卖",async function(){
            const expiration = Math.floor(Date.now() / 1000) + 3600; 
            let auctionCreateTx:ContractTransaction = await chainYVault.connect(seller).createAucion(configId,auctionValue.hashSecret,expiration,{value:baseAmount})
            let auctionCreateReceipt: ContractReceipt=await auctionCreateTx.wait();
            const event = auctionCreateReceipt.events?.find(
                (e: any) => e.event === "AuctionCreated"
            );

            expect(event).to.not.be.undefined;
            const auctionId = event.args.auctionId;
            const auction = await chainYVault.auctions(auctionId);
            expect(auction.auctionType).to.equal(auctionType);
            expect(auction.baseAmount).to.equal(baseAmount);
        });

        it ("X链创建拍卖",async function(){
            const crossChainMessage=ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint256 sourceChainId, bytes rawTransaction, bytes rawRecpt)"],
                [[chainYId, auctionCreateTx.rawTransaction, ]]
            );
        });
    });
});