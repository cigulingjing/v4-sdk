import { BigNumber } from 'ethers';
import { amount0 } from '../lib/liqCalculation';

// FullMath.mulDivRoundingUp: Multiplies two numbers and divides the result by a denominator, rounding up
function mulDivRoundingUp(a: BigNumber, b: BigNumber, denominator: BigNumber): BigNumber {
    const product = a.mul(b);
    const remainder = product.mod(denominator);
    const quotient = product.div(denominator);
    return remainder.isZero() ? quotient : quotient.add(1);
}

// UnsafeMath.divRoundingUp: Divides two numbers, rounding up
function divRoundingUp(a: BigNumber, b: BigNumber): BigNumber {
    const remainder = a.mod(b);
    const quotient = a.div(b);
    return remainder.isZero() ? quotient : quotient.add(1);
}

// Example usage
function calculateAmount0Delta(
    numerator1: BigNumber,
    numerator2: BigNumber,
    sqrtPriceBX96: BigNumber,
    sqrtPriceAX96: BigNumber
): BigNumber {
    // Equivalent to the Solidity code snippet
    return divRoundingUp(mulDivRoundingUp(numerator1, numerator2, sqrtPriceBX96), sqrtPriceAX96);
}

// Define the FixedPoint96 resolution (2^96)
const FixedPoint96_RESOLUTION = BigNumber.from(2).pow(96);

// Example values for liquidity, sqrtPriceAX96, and sqrtPriceBX96
// ref: test/libraries/SqrtPriceMath.t.sol, test_swapComputation_sqrtPTimessqrtQOverflows, line 337
const liquidity = BigNumber.from("50015962439936049619261659728067971248"); // Example value
const sqrtPriceAX96 = BigNumber.from("1025574284609383582644711336373707553698163132913"); // Example value
const sqrtPriceBX96 = BigNumber.from("1025574284609383690408304870162715216695788925244"); // Example value

// Calculate numerator1 and numerator2
const numerator1 = liquidity.mul(FixedPoint96_RESOLUTION);  // This is equivalent to shifting left by the FixedPoint96 resolution
const numerator2 = sqrtPriceBX96.sub(sqrtPriceAX96);

const result = calculateAmount0Delta(numerator1, numerator2, sqrtPriceBX96, sqrtPriceAX96);
console.log(result.toString());

const result2 = amount0(liquidity, sqrtPriceBX96, sqrtPriceAX96);
console.log(result2.toString());
