import { ethers } from "hardhat";
import { ModifyPositionParams } from "../lib/types";

// Example ModifyLiquidityParams
const positionParams: ModifyPositionParams = {
  tickLower: 84222,
  tickUpper: 86129,
  liquidityDelta: BigInt("1517882343751509868544"),
  salt: ethers.keccak256("0x00")
};

// Example hookData as a hex string
const hookData = "0x10";

// Get ABI encoding
const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
  ["tuple(int24,int24,int256,bytes32)", "bytes"],
  [positionParams, hookData]
);

console.log("Encoded Data:", encodedData);
