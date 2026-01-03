import { ethers } from "hardhat";
import { expect } from "chai";
// LoadFixture is used to set up a fresh blockchain state for each test
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("LimitOrder", function () {
    const TICK_SPACING = 10;
    const SWAP_FEE = 3000;
    const sqrtPriceX96 = ethers.utils.parseEther("1"); 

    async function deployFixture() {
        const [deployer, user] = await ethers.getSigners();

        const MockERC20Factory = await ethers.getContractFactory("MockERC20", deployer);
        const token0 = await MockERC20Factory.deploy("Token0", "T0", 18);
        const token1 = await MockERC20Factory.deploy("Token1", "T1", 18);

        // Ensure token0 is "less than" token1 for pool key purposes
        const [sortedToken0, sortedToken1] =
            (token0.address).toLowerCase() < (token1.address).toLowerCase()
                ? [token0, token1]
                : [token1, token0];

        const PoolManagerFactory = await ethers.getContractFactory("PoolManager", deployer);
        const PoolManager = await PoolManagerFactory.deploy(user.address);

        const LimitOrderFactory = await ethers.getContractFactory("LimitOrder", deployer);
        const limitOrder = await LimitOrderFactory.deploy(PoolManager.address);

        const poolKey = {
            currency0: sortedToken0.address,
            currency1: sortedToken1.address,
            fee: SWAP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: limitOrder.address,
        };

        // Mint some tokens for the user
        const initialAmount = ethers.utils.parseEther("1000");
        await sortedToken0.mint(user.address, initialAmount);
        await sortedToken1.mint(user.address, initialAmount);

        // User approves PoolManager contract to spend their tokens, as it's the one pulling funds
        await sortedToken0.connect(user).approve(PoolManager.address, ethers.constants.MaxUint256);
        await sortedToken1.connect(user).approve(PoolManager.address, ethers.constants.MaxUint256);
        
        // Initialize PoolManager's pool state (mock)
        await PoolManager.initialize(poolKey, sqrtPriceX96);

        // Initialize add liquidity
        const modifyPositionParams={
            tickLower: -TICK_SPACING * 10,
            tickUpper: TICK_SPACING * 10,
            liquidityDelta: ethers.utils.parseEther("1000"),
        };
        const tx = await PoolManager.addLiquidity(modifyPositionParams, "");
        await tx.wait();    

        return {
            deployer,
            user,
            token0: sortedToken0,
            token1: sortedToken1,
            PoolManager,
            limitOrder,
            poolKey,
        };
    }

    describe("Placing a limit order", function () {
        it("Should allow a user to place a limit order", async function () {
            const { user, limitOrder, poolKey, token0, PoolManager } = await loadFixture(deployFixture);
            const orderAmount = ethers.utils.parseEther("10");
            const tickLower = -10;
            const zeroForOne = true;
            const initialUserBalance = await token0.balanceOf(user.address);

            await expect(limitOrder.connect(user).place(poolKey, tickLower, zeroForOne, orderAmount))
                .to.emit(limitOrder, "Place");

            const finalUserBalance = await token0.balanceOf(user.address);
            const poolManagerBalance = await token0.balanceOf(PoolManager.address);

            // User's balance decreases
            expect(finalUserBalance).to.be.lt(initialUserBalance);
            // PoolManager's balance increases
            expect(poolManagerBalance).to.be.gt(0);
        });
    });

    describe("Filling a limit order", function () {
        it("Should fill a limit order after a swap", async function () {
            const { user, limitOrder, PoolManager, poolKey, token0, token1 } = await loadFixture(deployFixture);
            const orderAmount = ethers.utils.parseEther("10");
            const tickLower = -10;
            const zeroForOne = true;

            // Place order
            await limitOrder.connect(user).place(poolKey, tickLower, zeroForOne, orderAmount);
            const epoch = await limitOrder.getEpoch(poolKey, tickLower, zeroForOne);

            // Simulate a swap that crosses the tick
            // Set current tick on mock pool manager to be past the order's tick
            await PoolManager.setTick(tickLower - TICK_SPACING);

            const swapParams = {
                zeroForOne: false, // Swap direction is opposite of limit order direction
                amountSpecified: ethers.utils.parseEther("-1"), // negative for exact output
                sqrtPriceLimitX96: 0,
            };
            
            const salt = ethers.utils.formatBytes32String("test");
            const hookData = ethers.utils.defaultAbiCoder.encode(["bytes32"], [salt]);

            // The pool manager would call this hook after a swap
            await limitOrder.afterSwap(user.address, poolKey, swapParams, "0x", hookData);

            const epochInfo = await limitOrder.epochInfos(epoch);
            expect(epochInfo.filled).to.be.true;

            // The limit order contract should now hold the filled tokens (token1 in this case)
            const contractToken1Balance = await token1.balanceOf(limitOrder.address);
            expect(contractToken1Balance).to.be.gt(0);
        });
    });

    describe("Killing/cancelling a limit order", function () {
        it("Should allow a user to cancel their limit order", async function () {
            const { user, limitOrder, poolKey, token0 } = await loadFixture(deployFixture);
            const orderAmount = ethers.utils.parseEther("10");
            const tickLower = -10;
            const zeroForOne = true;
            const initialUserBalance = await token0.balanceOf(user.address);

            // Place order
            await limitOrder.connect(user).place(poolKey, tickLower, zeroForOne, orderAmount);
            
            const balanceAfterPlace = await token0.balanceOf(user.address);
            expect(balanceAfterPlace).to.be.lt(initialUserBalance);

            // Kill order
            await expect(limitOrder.connect(user).kill(poolKey, tickLower, zeroForOne, user.address))
                .to.emit(limitOrder, "Kill");

            // User should get their tokens back
            const finalUserBalance = await token0.balanceOf(user.address);
            expect(finalUserBalance).to.equal(initialUserBalance);
        });
    });

    describe("Withdrawing from a filled limit order", function () {
        it("Should allow a user to withdraw from a filled order", async function () {
            const { user, limitOrder, PoolManager, poolKey, token1 } = await loadFixture(deployFixture);
            const orderAmount = ethers.utils.parseEther("10");
            const tickLower = -10;
            const zeroForOne = true;

            // Place order
            await limitOrder.connect(user).place(poolKey, tickLower, zeroForOne, orderAmount);
            const epoch = await limitOrder.getEpoch(poolKey, tickLower, zeroForOne);

            // Simulate swap and fill
            await PoolManager.setTick(tickLower - TICK_SPACING);
            const swapParams = { zeroForOne: false, amountSpecified: ethers.utils.parseEther("-1"), sqrtPriceLimitX96: 0 };
            const salt = ethers.utils.formatBytes32String("test");
            const hookData = ethers.utils.defaultAbiCoder.encode(["bytes32"], [salt]);
            await limitOrder.afterSwap(user.address, poolKey, swapParams, "0x", hookData);
            
            const initialUserToken1Balance = await token1.balanceOf(user.address);

            // Withdraw
            await expect(limitOrder.connect(user).withdraw(epoch, user.address))
                .to.emit(limitOrder, "Withdraw");

            // User should have received the filled tokens
            const finalUserToken1Balance = await token1.balanceOf(user.address);
            expect(finalUserToken1Balance).to.be.gt(initialUserToken1Balance);

            // Contract should have no more of the filled tokens for this order
            const contractToken1Balance = await token1.balanceOf(limitOrder.address);
            expect(contractToken1Balance).to.equal(0);
        });
    });
});
