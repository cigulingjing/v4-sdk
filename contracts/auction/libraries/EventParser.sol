// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library EventParser {
    // AuctionCreated 事件解析
    function parseAuctionCreatedEvent(bytes memory eventData) internal view returns (
        uint256 auctionId,
        uint32 auctionType,
        uint256 nonce,
        uint256 revealTime
    ) {
        // 验证数据长度
        require(eventData.length == 100, "Invalid event data length"); // 3 * 32 + 4 bytes

        // ! 直接使用assemly获取存在问题，改用abi.decode
        assembly {
            // 跳过前32字节的长度数据
            auctionId := mload(add(eventData, 32))    // 读取 auctionId
            auctionType := mload(add(eventData, 36))  // 读取 auctionType
            nonce := mload(add(eventData, 68))        // 读取 nonce
            revealTime := mload(add(eventData, 100))  // 读取 revealTime
        }

        // 验证参数有效性
        require(auctionId != 0, "Invalid auction ID");
        // require(nonce != 0, "Invalid nonce");
        require(revealTime > block.timestamp, "Invalid reveal time");
    }

    // 其他事件解析函数可以在这里添加... d

} 