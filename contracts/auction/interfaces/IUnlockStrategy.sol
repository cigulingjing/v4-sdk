// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUnlockStrategy {
    /**
     * @dev 处理解锁逻辑
     * @param eventTopic 事件的主题哈希
     * @param eventData 事件数据
     * @param lockedAmount 已锁定的金额
     * @return recipient 解锁的接收者
     * @return unlockAmount 解锁的金额
     */
    function processUnlock(
        bytes32 eventTopic,
        bytes memory eventData,
        uint256 lockedAmount
    ) external returns (address recipient, uint256 unlockAmount);
}