import { ethers } from "hardhat";

// Define an array of error signatures
// Error NotSelf(): 0x29c3b7ee
// Error HookAddressNotValid(address): 0xe65af6a0
// Error InvalidHookResponse(): 0x1e048e1d
// Error Wrap__FailedHookCall(address,bytes): 0x319d54c3
// Error ProtocolFeeCannotBeFetched(): 0x1ee49702
// Error AlreadyUnlocked(): 0x5090d6c6
// Error NotPoolManager(): 0xae18210a
// Error CurrencyNotSettled: 0x5212cba1
// Error PoolAlreadyInitialized(): 0x7983c051
// Error PoolNotInitialized(): 0x486aa307
// Error PriceLimitAlreadyExceeded(uint160,uint160): 0x7c9c6e8f
// Error NonZeroNativeValue(): 0x19d245cf
// Error ERC20InsufficientBalance(address,uint256,uint256): 0xe450d38c
// Error ERC20InsufficientAllowance(address,uint256,uint256): 0xfb8f41b2
// Error Wrap__NativeTransferFailed(address,bytes): 0x8549db59
// Error Wrap__ERC20TransferFailed(address,bytes): 0xb12c5f9c
// Error NotPoolManager(): 0xae18210a
// Error NotFilled(): 0x6cb6fbf0
// Error InvalidFunc(bytes4): 0x1f8f8d4b
// Error ZeroLiquidity(): 0x10074548
// Error InRange(): 0x23ac68e7
// Error CrossedRange(): 0xb319920d
const errorSignatures = [
  // Hooks.sol
  'NotSelf()',
  'HookAddressNotValid(address)',
  'InvalidHookResponse()',
  'Wrap__FailedHookCall(address,bytes)',

  'ProtocolFeeCannotBeFetched()',

  // PoolManager.sol
  'AlreadyUnlocked()',
  'NotPoolManager()',
  'CurrencyNotSettled()',
  'PoolAlreadyInitialized()',
  'PoolNotInitialized()',
  'PriceLimitAlreadyExceeded(uint160,uint160)',
  'NonZeroNativeValue()',

  // ERC20.sol
  'ERC20InsufficientBalance(address,uint256,uint256)',
  'ERC20InsufficientAllowance(address,uint256,uint256)',

  'Wrap__NativeTransferFailed(address,bytes)',
  'Wrap__ERC20TransferFailed(address,bytes)',

  // SafeCallBack.sol
  'NotPoolManager()',

  // LimitOrder.sol
  'NotFilled()',
  'InvalidFunc(bytes4)',
  'ZeroLiquidity()',
  'InRange()',
  'CrossedRange()',
];

// FuncSig afterInitialize(address,PoolKey,uint160,int24,bytes): 0x105397c6
// FuncSig lockAcquiredPlace((address,address,uint24,int24,address),int24,bool,int256,address,bytes32): 0x3f3e517d
const funcSignatures = [
    'afterInitialize(address,PoolKey,uint160,int24,bytes)',

    // LimitOrder.sol    
    'lockAcquiredPlace((address,address,uint24,int24,address),int24,bool,int256,address,bytes32)'
]

// Function to compute the function selector for an error signature
const computeFunctionSelector = (signature: string): string => {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(signature));
  return hash.slice(0, 10); // "0x" + 8 hex characters
};

// Iterate over the error signatures and compute their function selectors
errorSignatures.forEach((signature) => {
  const functionSelector = computeFunctionSelector(signature);
  console.log(`Error ${signature}: ${functionSelector}`);
});

funcSignatures.forEach((signature) => {
  const functionSelector = computeFunctionSelector(signature);
  console.log(`FuncSig ${signature}: ${functionSelector}`);
});
