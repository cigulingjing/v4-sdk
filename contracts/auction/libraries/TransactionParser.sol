// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../utils/RLPReader.sol";
import "hardhat/console.sol";

library TransactionParser {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;
    
    struct RawTransaction {
        uint256 nonce;
        uint256 gasPrice;
        uint256 gasLimit;
        address to;
        uint256 value;
        bytes data;
        uint256 v; // use full width to keep chainId info
        bytes32 r;
        bytes32 s;
    }

    struct RecptLog {
        bytes32 eventTopic;   // topic0: keccak256(event signature)
        bytes32[] topics;     // full topics array (topic0 + indexed fields)
        bytes eventData;      // abi-encoded non-indexed event data
    }

    // RLP 交易解析
    function parseRawTransaction(bytes memory rawTx) internal pure returns (RawTransaction memory) {
        RLPReader.RLPItem[] memory items = rawTx.toRlpItem().toList();
        require(items.length == 9, "Invalid transaction format");

        console.log("items length:", items.length);

        return RawTransaction({
            nonce: items[0].toUint(),
            gasPrice: items[1].toUint(),
            gasLimit: items[2].toUint(),
            to: address(uint160(items[3].toUint())),
            value: items[4].toUint(),
            data: items[5].toBytes(),
            v: items[6].toUint(),
            r: bytes32(items[7].toUint()),
            s: bytes32(items[8].toUint())
        });
    }

    function parseRecptLog(bytes memory receipt) internal pure returns (RecptLog memory) {
        RLPReader.RLPItem[] memory items = receipt.toRlpItem().toList();
        require(items.length >= 4, "Invalid receipt format");
        
        bytes memory logs = items[3].toBytes();
        RLPReader.RLPItem[] memory logItems = logs.toRlpItem().toList();
        require(logItems.length > 0, "No logs found");
            
        RLPReader.RLPItem[] memory logTopics = logItems[1].toList();

        bytes32[] memory topics = new bytes32[](logTopics.length);
        for (uint256 i = 0; i < logTopics.length; i++) {
            topics[i] = bytes32(logTopics[i].toBytes());
        }


        return RecptLog({
            eventTopic: topics[0],
            topics: topics,
            eventData: logItems[2].toBytes()
        });
    }

} 