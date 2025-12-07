import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS,CONTRACT_ADDRESSES,PRIVATE_KEY,RPC_URL } from "../scripts/config";
import { deployMockERC20} from "../scripts/deploy/deploy_mockERC20"

describe("MockERC20", function () {
    let token: Contract;
    let owner: Signer;
    let addr1: Signer;
    let addr2: Signer;

    const tokenName = "Mock Token";
    const tokenSymbol = "MCK";
    // 初始供应量为 1000 个代币 (假设18位小数)
    const initialSupply = ethers.utils.parseEther("1000");

    beforeEach(async function () {
        // 获取测试账户
        [owner, addr1, addr2] = await ethers.getSigners();

        // 部署合约
        const MockERC20Factory = await ethers.getContractFactory("MockERC20", owner);
        token = await MockERC20Factory.deploy(tokenName, tokenSymbol, initialSupply);
        await token.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right name and symbol", async function () {
            expect(await token.name()).to.equal(tokenName);
            expect(await token.symbol()).to.equal(tokenSymbol);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerAddress = await owner.getAddress();
            const ownerBalance = await token.balanceOf(ownerAddress);
            expect(await token.totalSupply()).to.equal(ownerBalance);
            expect(ownerBalance).to.equal(initialSupply);
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            const ownerAddress = await owner.getAddress();
            const addr1Address = await addr1.getAddress();
            const transferAmount = ethers.utils.parseEther("50");

            // 从 owner 转 50 个代币到 addr1
            await token.connect(owner).transfer(addr1Address, transferAmount);
            const addr1Balance = await token.balanceOf(addr1Address);
            expect(addr1Balance).to.equal(transferAmount);

            // 从 addr1 转 20 个代币到 addr2
            const addr2Address = await addr2.getAddress();
            const transferAmount2 = ethers.utils.parseEther("20");
            await token.connect(addr1).transfer(addr2Address, transferAmount2);
            const addr2Balance = await token.balanceOf(addr2Address);
            expect(addr2Balance).to.equal(transferAmount2);
        });

        it("Should fail if sender doesn’t have enough tokens", async function () {
            const ownerAddress = await owner.getAddress();
            const addr1Address = await addr1.getAddress();
            const initialOwnerBalance = await token.balanceOf(ownerAddress);

            // 尝试从 addr1 (余额为0) 转账
            const value=1;
            await expect(token.connect(addr1).transfer(ownerAddress, value))
                .to.be.revertedWithCustomError(token,"ERC20InsufficientBalance")
                .withArgs(addr1Address, 0, value); // address,balance,transfer amount

            // 确认 owner 余额未变
            expect(await token.balanceOf(ownerAddress)).to.equal(initialOwnerBalance);
        });
    });

    describe("Approval", function () {
        it("Should allow a spender to transfer tokens after approval", async function () {
            const ownerAddress = await owner.getAddress();
            const addr1Address = await addr1.getAddress();
            const addr2Address = await addr2.getAddress();
            const amountToApprove = ethers.utils.parseEther("100");

            // Owner 授权 addr1 可以动用 100 个代币
            await token.connect(owner).approve(addr1Address, amountToApprove);
            const allowance = await token.allowance(ownerAddress, addr1Address);
            expect(allowance).to.equal(amountToApprove);

            // Addr1 使用 transferFrom 将 owner 的 50 个代币转给 addr2
            const amountToTransfer = ethers.utils.parseEther("50");
            await token.connect(addr1).transferFrom(ownerAddress, addr2Address, amountToTransfer);

            // 检查余额
            expect(await token.balanceOf(ownerAddress)).to.equal(initialSupply.sub(amountToTransfer));
            expect(await token.balanceOf(addr2Address)).to.equal(amountToTransfer);

            // 检查剩余授权额度
            const remainingAllowance = await token.allowance(ownerAddress, addr1Address);
            expect(remainingAllowance).to.equal(amountToApprove.sub(amountToTransfer));
        });
    });

    describe("Minting", function () {
        it("Should allow minting new tokens to any address", async function () {
            const addr1Address = await addr1.getAddress();
            const mintAmount = ethers.utils.parseEther("200");
            const initialTotalSupply = await token.totalSupply();

            // 给 addr1 增发 200 个代ar币
            await token.connect(owner).mint(addr1Address, mintAmount);

            // 检查 addr1 余额和总供应量
            expect(await token.balanceOf(addr1Address)).to.equal(mintAmount);
            expect(await token.totalSupply()).to.equal(initialTotalSupply.add(mintAmount));
        });
    });
});

describe("Deterministic deployment of MockERC20",function(){
    const tokenName="BitCoin"
    const tokenSymbol="BTC"
    const initialSupply=ethers.utils.parseUnits("2100000", 18).toBigInt();
    let walletAddress="0x";
    let token0Address=CONTRACT_ADDRESSES["Token0"];
    let wallet:Signer;
    let token:Contract;

    beforeEach(async function(){
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        walletAddress = await wallet.getAddress();    
    });
    
    it("Owner",async function(){
        const token= await ethers.getContractAt("MockERC20",token0Address,wallet);
        let res:bigint=await token.balanceOf(walletAddress);
        console.log(res.toString());

        res=await token.balanceOf(CONTRACT_ADDRESSES["Create2"]);
        console.log(res.toString())
    });
    
});
        