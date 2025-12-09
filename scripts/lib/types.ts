
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
    tickLower: number;
    tickUpper: number;
    liquidityDelta: bigint;
}