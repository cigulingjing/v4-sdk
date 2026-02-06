
export interface PoolKey {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
}

export interface SwapParams {
    zeroForOne: boolean;
    amountSpecified: bigint;
    sqrtPriceLimitX96: bigint;
}

export interface ModifyPositionParams {
    tickLower: number; // 流动性生效最低价格
    tickUpper: number; // 流动性生效最高价格
    liquidityDelta: bigint;
    salt?:string;
}