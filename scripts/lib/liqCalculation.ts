// Constants
const MAX_TICK = BigInt('887272');
const q32 = BigInt(2) ** BigInt(32);
const q96 = BigInt(2) ** BigInt(96);
const q128 = BigInt(2) ** BigInt(128);
const q256 = BigInt(2) ** BigInt(256);

// Function to calculate tick from price with optional spacing
export function calculateTickFromPriceWithSpacing(price: number, tickSpacing = 60): number {
    const unroundedTick = calculateTickFromPrice(price);
    return Math.round(unroundedTick / tickSpacing) * tickSpacing;
}

// Function to calculate tick from price without spacing
export function calculateTickFromPrice(price: number): number {
    return Math.floor(Math.log(price) / Math.log(1.0001));
}

function getAbsTick(tick: bigint): bigint {
    // Ensure tick is within the int24 range
    const int24Max: bigint = BigInt(2) ** BigInt(23) - BigInt(1);
    const int24Min: bigint = BigInt(-2) ** BigInt(23);
    if (tick > int24Max || tick < int24Min) {
        throw new Error('tick is out of int24 range');
    }

    // Determine the mask: 0 if tick >= 0, -1 if tick < 0
    const mask: bigint = tick < BigInt(0) ? BigInt(-1) : BigInt(0);

    // Calculate absTick
    const absTick: bigint = (mask ^ (tick + mask));

    return absTick;
}

export function getSqrtPriceAtTick(tick: number): bigint {
    const absTick: bigint = getAbsTick(BigInt(tick));

    if (absTick > MAX_TICK) {
        throw new Error("Invalid tick");
    }

    let price = (absTick & BigInt(1)) === BigInt(0)
        ? q128
        : BigInt("0xfffcb933bd6fad37aa2d162d1a594001");

    if (absTick & BigInt(2)) price = (price * BigInt("0xfff97272373d413259a46990580e213a")) >> BigInt(128);
    if (absTick & BigInt(4)) price = (price * BigInt("0xfff2e50f5f656932ef12357cf3c7fdcc")) >> BigInt(128);
    if (absTick & BigInt(8)) price = (price * BigInt("0xffe5caca7e10e4e61c3624eaa0941cd0")) >> BigInt(128);
    if (absTick & BigInt(16)) price = (price * BigInt("0xffcb9843d60f6159c9db58835c926644")) >> BigInt(128);
    if (absTick & BigInt(32)) price = (price * BigInt("0xff973b41fa98c081472e6896dfb254c0")) >> BigInt(128);
    if (absTick & BigInt(64)) price = (price * BigInt("0xff2ea16466c96a3843ec78b326b52861")) >> BigInt(128);
    if (absTick & BigInt(128)) price = (price * BigInt("0xfe5dee046a99a2a811c461f1969c3053")) >> BigInt(128);
    if (absTick & BigInt(256)) price = (price * BigInt("0xfcbe86c7900a88aedcffc83b479aa3a4")) >> BigInt(128);
    if (absTick & BigInt(512)) price = (price * BigInt("0xf987a7253ac413176f2b074cf7815e54")) >> BigInt(128);
    if (absTick & BigInt(1024)) price = (price * BigInt("0xf3392b0822b70005940c7a398e4b70f3")) >> BigInt(128);
    if (absTick & BigInt(2048)) price = (price * BigInt("0xe7159475a2c29b7443b29c7fa6e889d9")) >> BigInt(128);
    if (absTick & BigInt(4096)) price = (price * BigInt("0xd097f3bdfd2022b8845ad8f792aa5825")) >> BigInt(128);
    if (absTick & BigInt(8192)) price = (price * BigInt("0xa9f746462d870fdf8a65dc1f90e061e5")) >> BigInt(128);
    if (absTick & BigInt(16384)) price = (price * BigInt("0x70d869a156d2a1b890bb3df62baf32f7")) >> BigInt(128);
    if (absTick & BigInt(32768)) price = (price * BigInt("0x31be135f97d08fd981231505542fcfa6")) >> BigInt(128);
    if (absTick & BigInt(65536)) price = (price * BigInt("0x9aa508b5b7a84e1c677de54f3e99bc9")) >> BigInt(128);
    if (absTick & BigInt(131072)) price = (price * BigInt("0x5d6af8dedb81196699c329225ee604")) >> BigInt(128);
    if (absTick & BigInt(262144)) price = (price * BigInt("0x2216e584f5fa1ea926041bedfe98")) >> BigInt(128);
    if (absTick & BigInt(524288)) price = (price * BigInt("0x48a170391f7dc42444e8fa2")) >> BigInt(128);

    if (tick > 0) {
        price = (q256 - BigInt(1)) / price;
    }

    return (price + q32 - BigInt(1)) >> BigInt(32); // Convert from Q128.128 to Q128.96 and round up
}

// Function to calculate price from tick
export function calculatePriceFromTick(tick: number): number {
    return Math.exp(tick * Math.log(1.0001));
}

// Function to convert price to sqrtPriceX96
export function priceToSqrtPrice(price: number): bigint {
    return BigInt(Math.floor(Math.sqrt(price) * Number(q96)));
}

// Function to convert sqrtPriceX96 to price
function sqrtPricetoPrice(sqrtprice: bigint): number {
    return (Number(sqrtprice) ** 2) / Number(q96 ** BigInt(2));
}

// Liquidity calculations for amount0 and amount1
export function liquidity0(amount: bigint, pa: bigint, pb: bigint): bigint {
    if (pa > pb) {
        [pa, pb] = [pb, pa];
    }
    return (amount * pa * pb) / q96 / (pb - pa);
}

export function liquidity1(amount: bigint, pa: bigint, pb: bigint): bigint {
    if (pa > pb) {
        [pa, pb] = [pb, pa];
    }
    return (amount * q96) / (pb - pa);
}

function divRoundingUp(a: bigint, b: bigint): bigint {
    const remainder = a % b;
    const quotient = a / b;
    return remainder === BigInt(0) ? quotient : quotient + BigInt(1);
}

// Amount calculations for liquidity0 and liquidity1
export function amount0(liquidity0: bigint, pa: bigint, pb: bigint): bigint {
    if (pa > pb) {
        [pa, pb] = [pb, pa];
    }
    const diff = pb - pa;
    return divRoundingUp((liquidity0 * q96 * diff), pa * pb);
}

export function amount1(liquidity1: bigint, pa: bigint, pb: bigint): bigint {
    if (pa > pb) {
        [pa, pb] = [pb, pa];
    }
    const diff = pb - pa;
    return divRoundingUp(liquidity1 * diff, q96);
}

// Simplified version to calculate liquidity delta
export function calculateLiqDelta(ticklow: number, sqrt_cur: bigint, tickupp: number, amt0: bigint, amt1: bigint): [bigint, bigint, bigint] {
    const sqrt_low = getSqrtPriceAtTick(ticklow);
    const sqrt_upp = getSqrtPriceAtTick(tickupp);
    // console.log(`sqrt_low: ${sqrt_low}, sqrt_upp: ${sqrt_upp}, sqrt_cur: ${sqrt_cur}`);

    if (sqrt_low > sqrt_cur) {
        const liq0 = liquidity0(amt0, sqrt_low, sqrt_upp);
        return [liq0, amount0(liq0, sqrt_low, sqrt_upp), BigInt(0)];
    } else if (sqrt_cur > sqrt_upp) {
        const liq1 = liquidity1(amt1, sqrt_upp, sqrt_low);
        return [liq1, BigInt(0), amount1(liq1, sqrt_low, sqrt_upp)];
    } else {
        const liq0 = liquidity0(amt0, sqrt_cur, sqrt_upp);
        const liq1 = liquidity1(amt1, sqrt_cur, sqrt_low);

        const liq = liq0 < liq1 ? liq1 : liq0;
        return [liq, amount0(liq, sqrt_cur, sqrt_upp), amount1(liq, sqrt_low, sqrt_cur)];
    }
}
