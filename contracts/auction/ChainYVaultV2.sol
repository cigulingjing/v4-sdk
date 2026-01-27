// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/RLPReader.sol";
import "./interfaces/IUnlockStrategy.sol";
import "./libraries/TransactionParser.sol";
import "./coinbase-and-stake/invokeCoinbase.sol";

// CoinBaseOperator继承属性，支持Coinbase激励发放
contract ChainYVaultV2 is ReentrancyGuard, Ownable,CoinbaseOperator {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    struct AuctionConfig {
        uint32 auctionType;            // 4字节竞标类型: 00 || 00 || 单次/多次 || 公开竞标
        uint256 baseAmount;            // 拍卖的最小单位金额
        bool isSystemExpiration;       // 是否系统时间
        bool isActive;                 // 是否激活
    }

    struct Auction {
        uint32 auctionType;           // 应该和config保持一致
        uint256 baseAmount;           
        uint256 revealTime;           // 揭示时间
    }

    struct AuctionLock {
        address owner;
        bytes32 hashSecret;
        uint256 amount;
        uint32 auctionType;           // 4字节竞标类型
        bool isLocked;
        bool secretRevealed;
        uint256 revealTime;           // 揭示时间
        uint256 auctionId;            // 竞标ID
    }

    uint256 public activeAuctionsCount;
    uint256 public activeConfigsCount;
    uint256 public onlyOneAuction;
    CoinbaseOperator public coinbase; 

    mapping(bytes32 => AuctionLock) public lockedTokens;
    mapping(uint256 => AuctionConfig) public auctionConfigs;
    mapping(uint32 => address) public unlockStrategies;
    mapping(uint256 => Auction) public auctions;

    event AuctionConfigCreated(
        uint256 indexed configId,
        uint32 auctionType,
        uint256 baseAmount,
        uint256 extension
    );
    
    event AuctionCreated(
        uint256 indexed auctionId,
        uint32 auctionType,
        uint256 activeAuctionCount,
        uint256 revealTime
    );
    
    event TokensLocked(
        bytes32 indexed lockId,
        address indexed owner,
        uint256 amount,
        uint32 auctionType,
        uint256 auctionId
    );

    event TokensUnlocked(
        bytes32 indexed lockId,
        address indexed recipient,
        uint256 amount
    );

    event UnlockStrategyUpdated(uint32 indexed auctionType, address strategy);

    constructor(address coinBaseAddress) ReentrancyGuard() Ownable(msg.sender) {
        coinbase = CoinbaseOperator(coinBaseAddress);
    }

    function isSingleAuction(uint32 auctionType) internal pure returns (bool) {
        return (auctionType & 0x0000FF00) == 0;
    }

    function setUnlockStrategy(uint32 auctionType, address strategy) external onlyOwner {
        require(strategy != address(0), "Invalid strategy address");
        unlockStrategies[auctionType] = strategy;
        emit UnlockStrategyUpdated(auctionType, strategy);
    }


    // 创建Config，创建config，createAuction创建必须指定ID
    function createAuctionConfig(
        uint32 auctionType,
        uint256 baseAmount,
        uint256 extension
    ) external onlyOwner {
        uint256 configId = activeConfigsCount;
        auctionConfigs[configId] = AuctionConfig({
            auctionType: auctionType,
            baseAmount: baseAmount,
            isSystemExpiration: false,
            isActive: true
        });
        activeConfigsCount++;
        emit AuctionConfigCreated(configId, auctionType, baseAmount, extension);
    }

    function getTodayEndTimestamp() public view returns (uint256) {
        // 获取当前时间戳
        uint256 timestamp = block.timestamp;
        
        // 计算当天结束时间 (UTC 23:59:59)
        // 1 天 = 86400 秒
        // 将时间戳除以86400得到天数，加1后乘以86400得到下一天的开始
        // 然后减去1秒得到当天的结束时间
        return ((timestamp / 86400) * 86400) + 86400 - 1;
    }

    function createAuction(
        uint256 configId,
        bytes32 hashSecret,  // 哈希时间锁.
        uint256 expiration
    ) external payable returns (bytes32 lockId) { // nonReentrant
        AuctionConfig memory config = auctionConfigs[configId];
        require(config.isActive, "Auction not active");   

        Auction memory auction = auctions[onlyOneAuction];
        if (auction.baseAmount != 0 && !isSingleAuction(auction.auctionType)) {
            require(auction.revealTime < block.timestamp, "Only one auction is allowed");
        }
        
        // 生成唯一的 auctionId
        uint256 auctionId = uint256(keccak256(abi.encodePacked(
            msg.sender,
            block.chainid,
            address(this),
            activeAuctionsCount
        )));
        activeAuctionsCount++;


        uint32 auctionType = config.auctionType;
        uint256 revealTime = isSingleAuction(auctionType) && !config.isSystemExpiration ? 
                            expiration : getTodayEndTimestamp();

        onlyOneAuction = isSingleAuction(config.auctionType) ? onlyOneAuction : auctionId;

        auctions[auctionId] = Auction({
            auctionType: auctionType,
            baseAmount: config.baseAmount,
            revealTime: revealTime
        });

        lockId = lockTokens(hashSecret, auctionId);
        emit AuctionCreated(auctionId, auctionType, activeAuctionsCount-1, revealTime);
    }

    function lockTokens(
        bytes32 hashSecret,
        uint256 auctionId
    ) public payable nonReentrant returns (bytes32 lockId) {
        Auction storage auction = auctions[auctionId];
        uint32 auctionType = auction.auctionType;
        require(auctionType != 0, "Auction not exist");
        require(msg.value > 0, "Amount must be greater than 0");
        require(msg.value % auction.baseAmount == 0, "Amount must be multiple of baseAmount");

        lockId = keccak256(abi.encodePacked(
            block.chainid,
            address(this),
            auctionId,
            msg.sender,
            hashSecret,
            auctionType
        ));

        require(!lockedTokens[lockId].isLocked, "Lock ID exists");

        lockedTokens[lockId] = AuctionLock({
            owner: msg.sender,
            hashSecret: hashSecret,
            amount: msg.value,
            auctionType: auctionType,
            isLocked: true,
            secretRevealed: false,
            revealTime: auction.revealTime,
            auctionId: auctionId
        });

        emit TokensLocked(lockId, msg.sender, msg.value, auctionType, auctionId);
    }

    // 接受 auction链的receipt事件才可以解锁。
    // 例如： MatchResultWithdrawn(uint256,bytes32,address,uint256)
    function unlockTokens(bytes32 lockId, bytes memory receipt) external nonReentrant {
        AuctionLock storage lock = lockedTokens[lockId];
        require(lock.isLocked, "Tokens not locked");
        
        address strategy = unlockStrategies[lock.auctionType];
        require(strategy != address(0), "No unlock strategy");

        TransactionParser.RecptLog memory log = TransactionParser.parseRecptLog(receipt);

        // 从log中解析出：中标成功者，和解锁金额
        (address recipient, uint256 unlockAmount) = IUnlockStrategy(strategy).processUnlock(
            log.eventTopic,
            log.eventData,
            lock.amount
        );

        require(unlockAmount <= lock.amount, "Invalid unlock amount"); 
        lock.isLocked = false;
        
        // CoinBase逻辑,通过CoinBase发送奖励
        uint256 rewardAmount = 0;
        if (recipient == address(0)) {
            // 竞拍者地址为0，退回给原主人
            recipient = lock.owner;
            rewardAmount = lock.amount;
        } else if (recipient != address(this)) {
            rewardAmount = unlockAmount;
        }

        if (address(coinbase) == address(0)){
            // 方法1 :直接发起转账
            if (recipient == address(0)) {
                // 竞拍者地址为0，退回给原主人
                (bool success, ) = lock.owner.call{value: lock.amount}("");
                require(success, "Transfer failed");
            } else if (recipient != address(this)) {
                // 直接转账
                (bool success, ) = recipient.call{value: unlockAmount}("");
                require(success, "Transfer failed");
            }
        }else{
            // 方法2: CoinBase合约发放
            address[] memory recipients = new address[](1);
            recipients[0] = recipient;      // 或 lock.owner，看你的业务
            uint256[] memory amounts = new uint256[](1);
            amounts[0] = rewardAmount;

            // 调用CoinBase分发奖励接口
            coinbase.distributeRewardDirectly(
                "ChainYVaultV2",
                0,               // rewardTypeId，确保 0 对应你定义的类型
                recipients,
                amounts
            );
        }
        emit TokensUnlocked(lockId, recipient, unlockAmount);
    }

    function getAuctionInfo(uint256 auctionId) 
        external 
        view 
        returns (
            uint32 auctionType,
            uint256 baseAmount,
            uint256 revealTime
        ) 
    {
        Auction storage auction = auctions[auctionId];
        return (
            auction.auctionType,
            auction.baseAmount,
            auction.revealTime
        );
    }

    function getAuctionLockInfo(bytes32 lockId)
        external
        view
        returns (
            address owner,
            uint256 amount,
            bool isLocked,
            uint256 revealTime
        )
    {
        AuctionLock storage lock = lockedTokens[lockId];
        return (
            lock.owner,
            lock.amount,
            lock.isLocked,
            lock.revealTime
        );
    }

    function getActiveAuctionsCount() external view returns (uint256){
        return activeAuctionsCount;
    }

    receive() external payable {}
} 