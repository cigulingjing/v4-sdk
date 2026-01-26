// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./utils/RLPReader.sol";

contract ChainYVault is ReentrancyGuard {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    struct AuctionLock {
        address owner;
        bytes32 hashSecret;
        uint256 unlockTime;
        bool isLocked;
        uint256 amount;
        bool secretRevealed;
        uint256 auctionEndTime;
        address highestBidder;
        uint256 highestBid;
    }
    
    uint256 public baseAmount;
    uint256 public auctionDuration;
    mapping(bytes32 => AuctionLock) public lockedTokens;
    address public admin;
    
    constructor() {
        admin = msg.sender;
        baseAmount = 100 * (10 ** 18); // 初始值 100 PUNK
        auctionDuration = 1 hours;
    }
    
    function setBaseAmount(uint256 newAmount) external {
        require(msg.sender == admin, "Only admin can set base amount");
        require(newAmount > 0, "Base amount must be greater than 0");
        baseAmount = newAmount;
        emit BaseAmountUpdated(newAmount);
    }

    function setAuctionDuration(uint256 newDuration) external {
        require(msg.sender == admin, "Only admin can set auction duration");
        require(newDuration > 0, "Auction duration must be greater than 0");
        auctionDuration = newDuration;
        emit AuctionDurationUpdated(newDuration);
    }
    
    function lockTokens(
        bytes32 hashSecret, 
        uint256 revealTimestamp
    ) external payable nonReentrant returns (bytes32 lockId) {
        require(msg.value > 0, "Amount must be greater than 0");
        require(msg.value % baseAmount == 0, "Amount must be multiple of baseAmount");
        
        // 生成锁定ID
        lockId = keccak256(abi.encodePacked(
            msg.sender,
            hashSecret,
            revealTimestamp
        ));
        
        require(!lockedTokens[lockId].isLocked, "Lock ID already exists");
        
        // 记录锁定信息
        lockedTokens[lockId] = AuctionLock({
            owner: msg.sender,
            hashSecret: hashSecret,
            unlockTime: revealTimestamp,
            auctionEndTime: revealTimestamp + auctionDuration,
            isLocked: true,
            amount: msg.value,
            secretRevealed: false,
            highestBidder: address(0),
            highestBid: 0
        });
        
        emit TokensLocked(lockId, msg.sender, msg.value, hashSecret);
    }
    
    function updateHighestBid(bytes32 lockId, uint256 newBid) external {
        AuctionLock storage lock = lockedTokens[lockId];
        require(lock.isLocked, "Tokens not locked");
        require(newBid > lock.highestBid, "New bid must be higher than current highest bid");
        lock.highestBid = newBid;
        lock.highestBidder = msg.sender;
    }

    function unlockTokens(bytes32 lockId, bytes memory receipt) external nonReentrant {
        AuctionLock storage lock = lockedTokens[lockId];
        require(lock.isLocked, "Tokens not locked");
        
        // 解析以太坊收据
        RLPReader.RLPItem[] memory items = receipt.toRlpItem().toList();
        require(items.length >= 4, "Invalid receipt format");
        
        // 收据结构: [status, cumulativeGasUsed, logsBloom, logs[]]
        bytes memory logs = items[3].toBytes();
        RLPReader.RLPItem[] memory logItems = logs.toRlpItem().toList();
        require(logItems.length > 0, "No logs found");
        
        // 解析日志
        RLPReader.RLPItem[] memory logParts = logItems[0].toList();
        require(logParts.length >= 3, "Invalid log format");
        
        // 获取事件主题和数据
        bytes32 eventTopic = bytes32(logParts[1].toUint());
        bytes memory eventData = logParts[2].toBytes();
        if (eventTopic == keccak256("AuctionFinalized(bytes32,address,uint256)")) {
            (bytes32 auctionId, address winner,) = abi.decode(
                eventData,
                (bytes32, address, uint256)
            );
            require(auctionId == lockId, "Invalid auction ID");
            
            lock.isLocked = false;
            
            if (winner != address(0)) {
                // 有效出价，转给竞拍者
                (bool success, ) = winner.call{value: lock.amount}("");
                require(success, "Transfer failed");
                emit TokensUnlocked(lockId, winner, lock.amount);
            } else {
                // 竞拍者地址为0，退回给原主人
                (bool success, ) = lock.owner.call{value: lock.amount}("");
                require(success, "Transfer failed");
                emit TokensUnlocked(lockId, lock.owner, lock.amount);
            }
            
        } else if (eventTopic == keccak256("AuctionCancelled(bytes32)")) {
            (bytes32 auctionId) = abi.decode(eventData, (bytes32));
            require(auctionId == lockId, "Invalid auction ID");
            
            // 永久锁定
            emit TokensPermanentlyLocked(lockId, lock.amount);
        } else {
            revert("Invalid event");
        }
    }

    /*
    function unlockTokens(bytes32 lockId, bytes32 secret) external nonReentrant {
        AuctionLock storage lock = lockedTokens[lockId];
        require(lock.isLocked, "Tokens not locked");
        
        if (!lock.secretRevealed) {
            // 第一阶段：必须在 T_1 前公开 secret
            require(block.timestamp <= lock.unlockTime, "Secret not revealed before T_1, tokens locked forever");
            require(lock.owner == msg.sender, "Not the owner");
            require(keccak256(abi.encodePacked(secret)) == lock.hashSecret, "Invalid secret");
            
            lock.secretRevealed = true;
            lock.auctionEndTime = block.timestamp + auctionDuration;
            emit SecretRevealed(lockId, uint256(secret));
            return;
        }
        
        // 第二阶段：等待链 X 同步最高出价或超时解锁
        require(block.timestamp > lock.auctionEndTime, "Auction period not ended");
        
        if (lock.highestBid > uint256(secret) && lock.highestBidder != address(0)) {
            // 有效出价，转给竞拍者
            lock.isLocked = false;
            (bool success, ) = lock.highestBidder.call{value: lock.amount}("");
            require(success, "Transfer failed");
            emit TokensUnlocked(lockId, lock.highestBidder, lock.amount);
        } else {
            // 无有效出价，退还给原主人
            lock.isLocked = false;
            (bool success, ) = lock.owner.call{value: lock.amount}("");
            require(success, "Transfer failed");
            emit TokensUnlocked(lockId, lock.owner, lock.amount);
        }
    }*/

    // 接收原生代币的回退函数
    receive() external payable {}
    
    event TokensLocked(
        bytes32 indexed lockId,
        address indexed owner,
        uint256 amount,
        bytes32 hashSecret
    );
    
    event TokensUnlocked(
        bytes32 indexed lockId,
        address indexed owner,
        uint256 amount
    );
    
    event BaseAmountUpdated(uint256 newAmount);
    event SecretRevealed(bytes32 indexed lockId, uint256 secret);
    event AuctionDurationUpdated(uint256 newDuration);
    event TokensPermanentlyLocked(bytes32 indexed lockId, uint256 amount);
}