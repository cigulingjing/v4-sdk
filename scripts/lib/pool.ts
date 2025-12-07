import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { PoolKey, ModifyPositionParams } from "./types";

export async function modifyPosition(contract: Contract, modifyPositionParams: ModifyPositionParams, hookData: string) {
    // Add liquidity
    const tx = await contract.addLiquidity(modifyPositionParams, hookData);
    await tx.wait();
    console.log("Position modified successfully");
}

// Function to get Pool ID
export function getPoolId(poolKey: PoolKey): string {
    ;
    return ethers.utils.keccak256(ethers.utils.solidityPack(
        ["bytes"],
        [ethers.utils.defaultAbiCoder.encode(
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

export async function getPoolSqrtPrice(liqPool: Contract): Promise<bigint> {
    const slot0 = await getSlot0(liqPool);
    return slot0[0].toBigInt();
}

// Function to get Pool Price
export async function getPoolPrice(liqPool: Contract): Promise<number> {
    const slot0 = await getSlot0(liqPool);
    const q96 = 2n ** 96n;
    // slot0 type is @BigNumber
    const sqrtPriceX96:bigint = slot0[0].toBigInt();

    const priceX1e18 = (sqrtPriceX96 * sqrtPriceX96 * (10n ** 18n)) / (q96 * q96);
    const result = Number(priceX1e18) / 10**18;
    // console.log("price:", result.toString());
    return result;
}
