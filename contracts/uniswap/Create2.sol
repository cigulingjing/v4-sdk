// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "hardhat/console.sol";

// ref: https://docs.alchemy.com/docs/create2-an-alternative-to-deriving-contract-addresses
contract Create2 {
    event Deploy(address addr);


    function deployCreate2(bytes memory initCode) public payable returns (address newContract) {
        // Note that the safeguarding function `_guard` is called as part of the overloaded function
        // `deployCreate2`.
        newContract = deployCreate2WithSalt({salt: _generateSalt(), initCode: initCode});
    }

    function deployCreate2WithSalt(bytes memory initCode, bytes32 salt) public payable returns (address newContract) {
        assembly ("memory-safe") {
            /**
             * @param 1: amount of wei to send
             * @param 2: pointer to start of code (after the length field)
             * @param 3: size of code (loaded from the length field)
             * @param 4: salt from function arguments
             */
            newContract := create2(callvalue(), add(initCode, 0x20), mload(initCode), salt)
        }
        console.log("Create2 deployed to:", newContract);
        emit Deploy(newContract);
    }

     function computeCreate2Address(
        bytes32 salt,
        bytes32 initCodeHash,
        address deployer
    ) public pure returns (address computedAddress) {
        assembly ("memory-safe") {
            // |                      | ↓ ptr ...  ↓ ptr + 0x0B (start) ...  ↓ ptr + 0x20 ...  ↓ ptr + 0x40 ...   |
            // |----------------------|---------------------------------------------------------------------------|
            // | initCodeHash         |                                                        CCCCCCCCCCCCC...CC |
            // | salt                 |                                      BBBBBBBBBBBBB...BB                   |
            // | deployer             | 000000...0000AAAAAAAAAAAAAAAAAAA...AA                                     |
            // | 0xFF                 |            FF                                                             |
            // |----------------------|---------------------------------------------------------------------------|
            // | memory               | 000000...00FFAAAAAAAAAAAAAAAAAAA...AABBBBBBBBBBBBB...BBCCCCCCCCCCCCC...CC |
            // | keccak256(start, 85) |            ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ |
            let ptr := mload(0x40)
            mstore(add(ptr, 0x40), initCodeHash)
            mstore(add(ptr, 0x20), salt)
            mstore(ptr, deployer)
            let start := add(ptr, 0x0b)
            mstore8(start, 0xff)
            computedAddress := keccak256(start, 85)
        }
    }
    
    function _generateSalt() internal view returns (bytes32 salt) {
        unchecked {
            salt = keccak256(
                abi.encode(
                    // We don't use `block.number - 256` (the maximum value on the EVM) to accommodate
                    // any chains that may try to reduce the amount of available historical block hashes.
                    // We also don't subtract 1 to mitigate any risks arising from consecutive block
                    // producers on a PoS chain. Therefore, we use `block.number - 32` as a reasonable
                    // compromise, one we expect should work on most chains, which is 1 epoch on Ethereum
                    // mainnet. Please note that if you use this function between the genesis block and block
                    // number 31, the block property `blockhash` will return zero, but the returned salt value
                    // `salt` will still have a non-zero value due to the hashing characteristic and the other
                    // remaining properties.
                    blockhash(block.number - 32),
                    block.coinbase,
                    block.number,
                    block.timestamp,
                    block.prevrandao,
                    block.chainid,
                    msg.sender
                )
            );
        }
    }
}