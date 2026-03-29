// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/RLPReader.sol";
import "./interfaces/IUnlockStrategy.sol";
import "./libraries/TransactionParser.sol";
import "./coinbase-and-stake/invokeCoinbase.sol";

/**
 * @title ChainYVaultV2
 * @notice 链 Y 侧的质押锁仓合约，负责创建拍卖、锁定代币以及跨链解锁。
 *
 * @dev 跨链拍卖完整流程：
 *
 *   ┌─ 链 Y ──────────────────────────────────────────────────────────┐
 *   │ 1. Owner: createAuctionConfig()        — 创建拍卖配置           │
 *   │ 2. 卖方: createAuction(configId, ...)  — 创建拍卖 + 锁定代币    │
 *   │    ├─ 内部调用 lockTokens() 锁定 ETH                           │
 *   │    ├─ 发出 AuctionCreated 事件 → 供链 X 跨链同步               │
 *   │    └─ 发出 TokensLocked 事件                                   │
 *   └────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ 链 X ──────────────────────────────────────────────────────────┐
 *   │ 3. Relayer: createAuction(crossChainMessage)  — 跨链同步拍卖    │
 *   │                                                                 │
 *   │ ── 竞价期 [0, revealTime + bidPeriod) ──────────────────────    │
 *   │ 4. 卖方: verifySeller(...)  — 注册 vault + 绑定链 X 地址       │
 *   │ 5. 买方: placeBid(...)      — 密封出价 + 质押 ETH              │
 *   │                                                                 │
 *   │ ── 揭示期 [revealTime, revealTime + revealPeriod) ────────      │
 *   │ 6. 买方: revealBid(...)     — 揭示出价，链上自动更新最高价     │
 *   │                                                                 │
 *   │ ── 结算 & 提取（揭示期结束后，永久可操作）────────────────────   │
 *   │ 7. 任何人: settleAuction()        — 标记拍卖结算完成            │
 *   │ 8. 卖方:   withdrawMatchResult()  — 提取中标资金                │
 *   │ 9. 买方:   claimBidDeposit()      — 非中标者取回押金            │
 *   │    └─ withdrawMatchResult 发出 MatchResultWithdrawn 事件        │
 *   └────────────────────────────────────────────────────────────────┘
 *
 *   ┌─ 链 Y（回到本合约）─────────────────────────────────────────────┐
 *   │ 10. unlockTokens(lockId, receipt)                               │
 *   │     └─ 使用链 X 的 MatchResultWithdrawn 事件解锁代币            │
 *   └────────────────────────────────────────────────────────────────┘
 *
 *   撮合规则：链上自动撮合，最高出价者获胜（单盲拍卖）
 */
contract ChainYVaultV2 is ReentrancyGuard, Ownable,CoinbaseOperator {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    /**
     * @notice 拍卖配置模板，由 Owner 创建
     * @param auctionType      4字节竞标类型: 00 || 00 || 单次/多次 || 公开竞标
     * @param baseAmount       拍卖的最小单位金额（锁仓金额必须为其整数倍）
     * @param bidPeriod        竞价期时长（秒），传递到链 X 控制出价窗口
     * @param revealPeriod     揭示期时长（秒），传递到链 X 控制揭示窗口
     * @param isSystemExpiration 是否使用系统时间（当天 UTC 23:59:59）
     * @param isActive         配置是否激活
     */
    struct AuctionConfig {
        uint32 auctionType;
        uint256 baseAmount;
        uint256 bidPeriod;
        uint256 revealPeriod;
        bool isSystemExpiration;
        bool isActive;
    }

    /**
     * @notice 拍卖场次
     * @param auctionType   竞标类型（与 config 一致）
     * @param baseAmount    最小单位金额
     * @param revealTime    链 Y 侧的揭示时间（传递给链 X 作为 revealStartTime）
     * @param bidPeriod     竞价期时长（秒），来源于 AuctionConfig
     * @param revealPeriod  揭示期时长（秒），来源于 AuctionConfig
     */
    struct Auction {
        uint32 auctionType;
        uint256 baseAmount;
        uint256 revealTime;
        uint256 bidPeriod;
        uint256 revealPeriod;
    }

    /**
     * @notice 锁仓记录
     * @param owner         锁仓者（卖方）地址
     * @param hashSecret    锁仓承诺哈希 = keccak256(value, salt)
     * @param amount        锁定的 ETH 数量（wei）
     * @param auctionType   竞标类型
     * @param isLocked      是否仍处于锁定状态
     * @param secretRevealed 秘密是否已揭示（当前未使用，卖方在链 X 通过 verifySeller 揭示）
     * @param revealTime    揭示截止时间
     * @param auctionId     所属拍卖 ID
     */
    struct AuctionLock {
        address owner;
        bytes32 hashSecret;
        uint256 amount;
        uint32 auctionType;
        bool isLocked;
        bool secretRevealed;
        uint256 revealTime;
        uint256 auctionId;
    }

    /// @notice 已创建的拍卖总数（用于生成唯一 auctionId）
    uint256 public activeAuctionsCount;
    /// @notice 已创建的拍卖配置总数
    uint256 public activeConfigsCount;
    /// @notice 当前活跃的多次拍卖 ID（用于限制同时只有一个多次拍卖）
    uint256 public onlyOneAuction;
    /// @notice CoinBase 合约实例（用于奖励发放）
    CoinbaseOperator public coinbase; 

    /// @notice lockId => AuctionLock 映射
    mapping(bytes32 => AuctionLock) public lockedTokens;
    /// @notice configId => AuctionConfig 映射
    mapping(uint256 => AuctionConfig) public auctionConfigs;
    /// @notice auctionType => 解锁策略合约地址
    mapping(uint32 => address) public unlockStrategies;
    /// @notice auctionId => Auction 映射
    mapping(uint256 => Auction) public auctions;

    /// @notice 拍卖配置创建
    event AuctionConfigCreated(
        uint256 indexed configId,
        uint32 auctionType,
        uint256 baseAmount,
        uint256 extension
    );
    
    /// @notice 拍卖创建（链 X 通过此事件的跨链消息同步创建拍卖，包含竞价/揭示时长配置）
    event AuctionCreated(
        uint256 indexed auctionId,
        uint32 auctionType,
        uint256 activeAuctionCount,
        uint256 revealTime,
        uint256 bidPeriod,
        uint256 revealPeriod
    );
    
    /// @notice 代币锁定（卖方锁仓，链 Y 上公开可查锁仓金额）
    event TokensLocked(
        bytes32 indexed lockId,
        address indexed owner,
        uint256 amount,
        uint32 auctionType,
        uint256 auctionId
    );

    /// @notice 代币解锁（收到链 X 的 MatchResultWithdrawn 事件后触发）
    event TokensUnlocked(
        bytes32 indexed lockId,
        address indexed recipient,
        uint256 amount
    );

    constructor(address coinBaseAddress) ReentrancyGuard() Ownable(msg.sender) {
        coinbase = CoinbaseOperator(coinBaseAddress);
    }

    /// @dev 判断是否为单次拍卖（auctionType 第 2 字节为 0）
    function isSingleAuction(uint32 auctionType) internal pure returns (bool) {
        return (auctionType & 0x0000FF00) == 0;
    }

    /**
     * @notice 创建拍卖配置模板（仅 Owner）
     * @param auctionType   竞标类型编码
     * @param baseAmount    最小锁仓单位金额
     * @param bidPeriod     竞价期时长（秒），将通过跨链事件传递给链 X
     * @param revealPeriod  揭示期时长（秒），将通过跨链事件传递给链 X
     * @param extension     扩展参数（预留）
     */
    function createAuctionConfig(
        uint32 auctionType,
        uint256 baseAmount,
        uint256 bidPeriod,
        uint256 revealPeriod,
        uint256 extension
    ) external onlyOwner {
        require(bidPeriod > 0, "bidPeriod must be > 0");
        require(revealPeriod > 0, "revealPeriod must be > 0");
        uint256 configId = activeConfigsCount;
        auctionConfigs[configId] = AuctionConfig({
            auctionType: auctionType,
            baseAmount: baseAmount,
            bidPeriod: bidPeriod,
            revealPeriod: revealPeriod,
            isSystemExpiration: false,
            isActive: true
        });
        activeConfigsCount++;
        emit AuctionConfigCreated(configId, auctionType, baseAmount, extension);
    }

    /// @dev 获取当天 UTC 23:59:59 的时间戳（用于系统过期时间）
    function getTodayEndTimestamp() public view returns (uint256) {
        uint256 timestamp = block.timestamp;
        return ((timestamp / 86400) * 86400) + 86400 - 1;
    }

    /**
     * @notice 卖方创建拍卖并锁定代币（跨链流程起点）
     * @dev 创建拍卖 + 调用 lockTokens 锁定 msg.value。
     *      发出的 AuctionCreated 事件将被 relayer 捕获并转发到链 X，
     *      链 X 的 ChainXAuctionV2.createAuction() 会解析该事件进行同步。
     *      auctionId = keccak256(msg.sender, chainid, address(this), activeAuctionsCount)
     *
     * @param configId    拍卖配置 ID（指向 auctionConfigs 中的模板）
     * @param hashSecret  锁仓承诺哈希 = keccak256(value, salt)，卖方后续在链 X 通过 verifySeller 揭示
     * @param expiration  自定义揭示截止时间（单次拍卖 + 非系统时间时使用）
     * @return lockId     锁仓 ID（= vaultId on Chain X）
     */
    function createAuction(
        uint256 configId,
        bytes32 hashSecret,
        uint256 expiration
    ) external payable returns (bytes32 lockId) {
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
        uint256 currentCount=activeAuctionsCount;
        activeAuctionsCount++;


        uint32 auctionType = config.auctionType;
        uint256 revealTime = isSingleAuction(auctionType) && !config.isSystemExpiration ?  expiration : getTodayEndTimestamp();

        onlyOneAuction = isSingleAuction(config.auctionType) ? onlyOneAuction : auctionId;

        auctions[auctionId] = Auction({
            auctionType: auctionType,
            baseAmount: config.baseAmount,
            revealTime: revealTime,
            bidPeriod: config.bidPeriod,
            revealPeriod: config.revealPeriod
        });

        lockId = lockTokens(hashSecret, auctionId);
        emit AuctionCreated(auctionId, auctionType, currentCount, revealTime, config.bidPeriod, config.revealPeriod);
        
    }

    /**
     * @notice 锁定代币到指定拍卖
     * @dev lockId 的计算与链 X 的 vaultId 一致：
     *      lockId = keccak256(chainid, address(this), auctionId, msg.sender, hashSecret, auctionType)
     *      卖方在链 X 调用 verifySeller 时提供相同参数可重新计算出相同的 vaultId。
     *
     * @param hashSecret 锁仓承诺哈希
     * @param auctionId  拍卖 ID
     * @return lockId    锁仓 ID
     */
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

    /**
     * @notice 跨链解锁代币（使用链 X 的 MatchResultWithdrawn 事件证明）
     * @dev 链 X 上卖方调用 withdrawMatchResult 后发出 MatchResultWithdrawn 事件，
     *      将该事件的 receipt 传入本函数即可解锁链 Y 上对应的锁仓代币。
     *      解锁逻辑：
     *        - 若中标者 != address(0)：代币发送给中标者（或通过 CoinBase 发放）
     *        - 若中标者 == address(0)：代币退回给卖方（lock.owner）
     *
     * @param lockId  锁仓 ID（= 链 X 的 vaultId）
     * @param receipt 链 X 的交易收据（包含 MatchResultWithdrawn 事件）
     */
    function unlockTokens(bytes32 lockId, bytes memory receipt) external nonReentrant {
        AuctionLock storage lock = lockedTokens[lockId];
        require(lock.isLocked, "Tokens not locked");
        
        TransactionParser.RecptLog memory log = TransactionParser.parseRecptLog(receipt);
        // 从log中解析出：中标成功者，和解锁金额
        (address recipient, uint256 unlockAmount) = processUnlock(
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

    /**
     * @dev 解析 MatchResultWithdrawn 事件，提取中标者地址和解锁金额
     * @param eventTopic   事件 topic（需匹配 MatchResultWithdrawn 签名）
     * @param eventData    事件 data（ABI 编码的 auctionId, lockId, bidder, transferAmount）
     * @param lockedAmount 原始锁仓金额（用于校验上限）
     * @return recipient    解锁接收者地址
     * @return unlockAmount 解锁金额
     */
    function processUnlock(
        bytes32 eventTopic,
        bytes memory eventData,
        uint256 lockedAmount
    ) internal returns (address recipient, uint256 unlockAmount) {
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


    /// @notice 查询拍卖信息
    function getAuctionInfo(uint256 auctionId) 
        external 
        view 
        returns (
            uint32 auctionType,
            uint256 baseAmount,
            uint256 revealTime,
            uint256 bidPeriod,
            uint256 revealPeriod
        ) 
    {
        Auction storage auction = auctions[auctionId];
        return (
            auction.auctionType,
            auction.baseAmount,
            auction.revealTime,
            auction.bidPeriod,
            auction.revealPeriod
        );
    }

    /// @notice 查询锁仓记录
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

    /// @notice 获取已创建的拍卖总数
    function getActiveAuctionsCount() external view returns (uint256){
        return activeAuctionsCount;
    }

    /// @notice 获取已创建的配置总数
    function getActiveConfigsCount() external view returns (uint256){
        return activeConfigsCount;
    }

    receive() external payable {}
} 