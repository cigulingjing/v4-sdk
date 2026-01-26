// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

library BytesLib {

    function reverseBytes32(bytes32 input) public pure returns (bytes32) {
        bytes32 output;
        assembly {
            let outputPtr := add(output, 0x20)
            for { let i := 0 } lt(i, 32) { i := add(i, 1) } {
                mstore8(add(outputPtr, sub(31, i)), byte(i, input))
            }
        }
        return output;
    }

    // ref: https://ethereum.stackexchange.com/questions/83626/how-to-reverse-byte-order-in-uint256-or-bytes32
    function reverse(bytes32 input) internal pure returns (bytes32 v) {
        v = input;

        // swap bytes
        v = ((v & 0xFF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00) >> 8) |
            ((v & 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF) << 8);

        // swap 2-byte long pairs
        v = ((v & 0xFFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000) >> 16) |
            ((v & 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF) << 16);

        // swap 4-byte long pairs
        v = ((v & 0xFFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000) >> 32) |
            ((v & 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF) << 32);

        // swap 8-byte long pairs
        v = ((v & 0xFFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF0000000000000000) >> 64) |
            ((v & 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF) << 64);

        // swap 16-byte long pairs
        v = (v >> 128) | (v << 128);
    }

    function slice(bytes memory data, uint start, uint len) internal pure returns (bytes memory) {
        bytes memory result = new bytes(len);
        assembly {
            let dataPtr := add(data, 0x20)
            let resultPtr := add(result, 0x20)
            for { let i := 0 } lt(i, len) { i := add(i, 0x20) } {
                mstore(add(resultPtr, i), mload(add(dataPtr, add(start, i))))
            }
        }
        return result;
    }

    function slice32(bytes memory data, uint start) internal pure returns (bytes32) {
        require(start + 32 <= data.length, "slice32: out of bounds");

        bytes32 result;
        assembly {
            let dataPtr := add(data, 0x20)
            result := mload(add(dataPtr, start))
        }
        return result;
    }

    function toUint32(bytes memory b) internal pure returns (uint32) {
        require(b.length == 4, "Invalid input length");

        uint32 value;
        assembly {
            value := mload(add(b, 0x04))
        }
        return value;
    }

    function toUint64(bytes memory b) internal pure returns (uint64) {
        require(b.length == 8, "Invalid input length");

        uint64 value;
        assembly {
            value := mload(add(b, 0x08))
        }
        return value;
    }

    function bytesToUint(bytes memory b) internal pure returns (uint256){
        uint256 number;
        for(uint i = 0; i < b.length; i++){
            number = number + uint256(uint8(b[i])) * (2 ** (8 * (b.length - (i + 1))));
        }
        return number;
    }
    
    function reverseBytes(bytes memory input) internal pure returns (bytes memory) {
        bytes memory output = new bytes(input.length);
        assembly {
            let len := mload(input)
            let inputPtr := add(input, 0x20)
            let outputPtr := add(output, 0x20)
            for { let i := 0 } lt(i, len) { i := add(i, 0x20) } {
                mstore(add(outputPtr, sub(sub(len, i), 0x20)), mload(add(inputPtr, i)))
            }
        }
        return output;
    }

    function toBytes32(bytes memory b) internal pure returns (bytes32) {
        bytes32 out;
        assembly {
            out := mload(add(b, 0x20))
        }
        return out;
    }

    function toBytes(bytes32 _data) internal pure returns (bytes memory) {
        return abi.encodePacked(_data);
    }

    function equal(bytes memory _preBytes, bytes memory _postBytes) internal pure returns (bool) {
        bool success = true;

        assembly {
            let length := mload(_preBytes)

        // if lengths don't match the arrays are not equal
            switch eq(length, mload(_postBytes))
            case 1 {
            // cb is a circuit breaker in the for loop since there's
            //  no said feature for inline assembly loops
            // cb = 1 - don't breaker
            // cb = 0 - break
                let cb := 1

                let mc := add(_preBytes, 0x20)
                let end := add(mc, length)

                for {
                    let cc := add(_postBytes, 0x20)
                // the next line is the loop condition:
                // while(uint256(mc < end) + cb == 2)
                } eq(add(lt(mc, end), cb), 2) {
                    mc := add(mc, 0x20)
                    cc := add(cc, 0x20)
                } {
                // if any of these checks fails then arrays are not equal
                    if iszero(eq(mload(mc), mload(cc))) {
                    // unsuccess:
                        success := 0
                        cb := 0
                    }
                }
            }
            default {
            // unsuccess:
                success := 0
            }
        }

        return success;
    }

    /*
    * @notice Converts a little endian (LE) byte array of size 32 to big endian (BE), i.e., flips byte order
    * @param bytesLE To be flipped LE byte array
    * @return bytes32 BE representation of parsed bytesLE
    */
    function flipBytes(bytes memory bytesLE) internal pure returns (bytes memory) {
        bytes memory bytesBE = new bytes(bytesLE.length);
        for (uint i = 0; i < bytesLE.length; i++){
            bytesBE[bytesLE.length - i - 1] = bytesLE[i];
        }
        return bytesBE;
    }

    function flipBytes32(bytes32 bytesLE) internal pure returns (bytes32) {
        bytes memory bytesBE = new bytes(bytesLE.length);
        for (uint i = 0; i < bytesLE.length; i++){
            bytesBE[bytesLE.length - i - 1] = bytesLE[i];
        }
        return toBytes32(bytesBE);
    }
}