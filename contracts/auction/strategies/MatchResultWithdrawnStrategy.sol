// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUnlockStrategy.sol";

contract MatchResultWithdrawnStrategy is IUnlockStrategy {
    function processUnlock(
        bytes32 eventTopic,
        bytes memory eventData,
        uint256 lockedAmount
    ) external pure override returns (address recipient, uint256 unlockAmount) {
        // 验证事件主题是否为 MatchResultWithdrawn
        require(
            eventTopic == keccak256("MatchResultWithdrawn(uint256,bytes32,address,uint256)"),
            "Invalid event topic"
        );

        // 解析事件数据
        (
            uint256 auctionId,
            bytes32 lockId,
            address bidder,
            uint256 transferAmount
        ) = abi.decode(eventData, (uint256, bytes32, address, uint256));

        // 返回解锁信息
        return (
            bidder,              // 接收者为中标者
            transferAmount       // 解锁金额为转账金额
        );
    }
} 