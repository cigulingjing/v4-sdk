import { Contract, providers, Wallet } from "ethers";
import { PoolKey } from "./types";
import { getPoolId } from "./pool";
import { RPC_URL, PRIVATE_KEY, POOL_KEYS } from "../../../config/uniswap.config";
import {ethers} from "hardhat";
import { getContract } from "./wallet";

export async function getTickLowerLast(contract:Contract, poolKey: PoolKey): Promise<bigint> {
    const poolId = getPoolId(poolKey);
    return contract.getTickLowerLast(poolId);
}

// epoach is uint232 in solidity
export async function getEpoch(contract:Contract, poolKey: PoolKey, tickLower: bigint, zeroForOne: boolean): Promise<bigint> {
    const poolId = getPoolId(poolKey);
    return contract.getEpoch(poolId, tickLower, zeroForOne);
}

// uint256
export async function getEpochLiquidity(contract:Contract, epoch: bigint, ownerAddress:string): Promise<bigint> {
    return contract.getEpochLiquidity(epoch, ownerAddress);
}

export async function getTick(contract:Contract, poolKey: PoolKey): Promise<bigint> {
    const poolId = getPoolId(poolKey);
    return contract.getTick(poolId);
}

async function test(){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    let contract= await getContract(wallet,"LiquidPool");

    let zeroForOne=true;
    let tickLower=BigInt(-60);
    let epoch=getEpoch(contract, POOL_KEYS.limitOrderPoolKey,tickLower,zeroForOne);

}

test();