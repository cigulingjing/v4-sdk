import { ethers } from "hardhat";
import { Contract } from "ethers";
import { PoolKey, ModifyPositionParams } from "./types";

export async function modifyPosition(contract: Contract, modifyPositionParams: ModifyPositionParams, hookData: string) {
    // Add liquidity
    const tx = await contract.addLiquidity(modifyPositionParams, hookData);
    await tx.wait();
    console.log("Position modified successfully");
}

// Function to get Pool ID
export function getPoolId(poolKey: PoolKey): string {
    return ethers.keccak256(ethers.solidityPacked(
        ["bytes"],
        [ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
        )]
    ));
}

// Function to get Slot0 of the Pool
async function getSlot0(contract: Contract) {
    // const poolId = getPoolId(poolKey);
    // console.log(`PoolId: ${poolId}`);

    const slot0 = await contract.getSlot0();
    // console.log(`Returned slot0: ${JSON.stringify(slot0)}`);
    return slot0;
}

// Function to get Liquidity of the Pool
export async function getLiquidity(contract: Contract, poolKey: PoolKey) {
    const poolId = getPoolId(poolKey);
    console.log(`PoolId: ${poolId}`);

    const liquidity = await contract.getLiquidity(poolId);
    console.log(`Returned liquidity: ${liquidity}`);
    return liquidity;
}

export async function getPoolSqrtPrice(liqPool: Contract): Promise<BigInt> {
    const slot0 = await getSlot0(liqPool);
    return slot0[0];
}

// Function to get Pool Price
export async function getPoolPrice(liqPool: Contract): Promise<number> {
    const slot0 = await getSlot0(liqPool);
    const q96 = 2n ** 96n;
    const sqrtPriceX96 = slot0[0];

    const result = Number(sqrtPriceX96**2n * 1000n / q96**2n) / 1000;
    // console.log("price:", result.toString());

    return result;
}
