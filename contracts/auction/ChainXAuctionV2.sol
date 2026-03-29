// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/TransactionParser.sol";
import "./libraries/EventParser.sol";
import "hardhat/console.sol";

/**
 * @title ChainXAuctionV2
 * @notice 链 X 侧的跨链拍卖合约，负责竞价撮合与结算。
 *
 * @dev 业务时间线：
 *   创建 → [竞价期 bidPeriod: 卖方注册vault + 买方出价]
 *        → [揭示期 revealPeriod: 买方揭示出价，链上自动更新最高价]
 *        → 结算 → 提取代币(永久)
 *   bidPeriod 和 revealPeriod 由链 Y 的 AuctionConfig 配置，通过 AuctionCreated 事件跨链传递。
 *
 *   撮合规则：链上自动撮合，最高出价者获胜（单盲拍卖）
 *   数据层级关系：
 *     Auction (1) ── Vault (N)  卖方通过 revealLock 注册并验证身份
 *                 ── Bid   (M)  一个 bidder 对一个 auction 一个出价
 */
contract ChainXAuctionV2 is ReentrancyGuard, Ownable {

    // ─────────────────────────────────────────────
    //  状态变量
    // ─────────────────────────────────────────────

    /// @notice 链 Y Vault 合约地址，用于跨链身份校验
    address public vaultAddress;

    /// @notice auctionId => Auction 的映射
    mapping(uint256 => Auction) public auctions;

    /// @dev BID_PERIOD 和 REVEAL_PERIOD 不再是全局常量，
    ///      而是通过链 Y 的 AuctionCreated 事件逐拍卖传入，
    ///      存储在 Auction.bidPeriod / Auction.revealPeriod 中。

    // ─────────────────────────────────────────────
    //  自定义错误
    // ─────────────────────────────────────────────

    /// @dev 拍卖不处于激活状态
    error AuctionNotActive(uint256 auctionId);
    /// @dev 拍卖尚未结算
    error AuctionNotSettled(uint256 auctionId);
    /// @dev 揭示期尚未结束
    error RevealPeriodNotEnded(uint256 auctionId, uint256 currentTimestamp, uint256 requiredTimestamp);
    /// @dev vault 不存在
    error VaultDoesNotExist(uint256 auctionId, bytes32 vaultId);

    // ─────────────────────────────────────────────
    //  结构体
    // ─────────────────────────────────────────────

    /**
     * @notice 单个资产锁仓项
     * @dev 由卖方通过 revealLock 注册，创建即揭示（验证 secretHash 原像 + 绑定卖方身份）
     * @param exists       是否存在
     * @param vaultSecretHash 锁仓 secret hash（来自链 Y 的 lockTokens）
     * @param value        锁仓的真实代币价值
     * @param salt         揭示用的盐值
     * @param seller       卖方在链 X 上的地址（revealLock 时绑定）
     * @param isWithdrawn  卖方是否已提取资金
     */
    struct Vault {
        bool exists;
        bytes32 vaultSecretHash;
        uint256 value;
        bytes32 salt;
        address seller;
        bool isWithdrawn;
    }

    /**
     * @notice 竞标者出价记录
     * @dev 一个 bidder 对一个 auction 只有一个出价
     * @param bidSecretHash 竞价 secret hash（密封竞价时使用）
     * @param bidValue      揭示后的真实出价
     * @param isSealed      是否密封竞价
     * @param depositAmount 质押金额（wei），需 >= 出价额
     * @param isRevealed    出价是否已揭示
     */
    struct Bid {
        bytes32 bidSecretHash;
        uint256 bidValue;
        bool isSealed;
        uint256 depositAmount;
        bool isRevealed;
    }

    /**
     * @notice 拍卖场次
     * @dev 链上自动撮合：revealBid 时自动更新 highestBidder/highestBid
     * @param chainid        来源链 ID（链 Y）
     * @param auctionType    竞标类型（低 8 位 = 0xFF 表示密封竞价）
     * @param revealTime     竞价截止时间 = revealStartTime + bidPeriod
     * @param bidPeriod      竞价期时长（秒），来源于链 Y 的 AuctionCreated 事件
     * @param revealPeriod   揭示期时长（秒），来源于链 Y 的 AuctionCreated 事件
     * @param isActive       拍卖是否激活
     * @param isSettled      拍卖是否已结算（揭示期结束后由 settleAuction 标记）
     * @param vaults         vault 映射
     * @param bids           bidder 映射
     * @param highestBidder  当前最高出价者
     * @param highestBid     当前最高出价
     */
    struct Auction {
        uint256 chainid;
        uint32 auctionType;
        uint256 revealTime;
        uint256 bidPeriod;
        uint256 revealPeriod;
        bool isActive;
        bool isSettled;
        mapping(bytes32 => Vault) vaults;
        mapping(address => Bid) bids;
        address highestBidder;
        uint256 highestBid;
    }

    /**
     * @notice 跨链数据封装，包含来源链 ID、原始交易和收据
     * @param sourceChainId 来源链 ID
     * @param rawTransaction 原始交易
     * @param rawRecpt 收据
     */
    struct CrossChainData {
        uint256 sourceChainId;
        bytes rawTransaction;
        bytes rawRecpt;
    }

    // ─────────────────────────────────────────────
    //  事件
    // ─────────────────────────────────────────────

    /// @notice 拍卖创建
    event AuctionCreated(uint256 indexed auctionId, uint32 auctionType, uint256 endTime);
    /// @notice 拍卖结算完成，最高出价者获胜
    event AuctionSettled(uint256 indexed auctionId, address indexed winner, uint256 highestBid);
    /// @notice 卖方注册 vault 并验证身份
    event VaultRegistered(uint256 indexed auctionId, bytes32 indexed vaultId, address indexed seller, uint256 value);
    /// @notice 竞标者出价
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 depositAmount);
    /// @notice 竞标者揭示出价
    event BidRevealed(uint256 indexed auctionId, address indexed bidder, uint256 bidValue);
    /// @notice 卖方提取资金
    event MatchResultWithdrawn(uint256 indexed auctionId, bytes32 indexed vaultId, address indexed seller, uint256 amount);
    /// @notice Vault 合约地址更新
    event VaultAddressUpdated(address indexed oldVault, address indexed newVault);

    /**
     * @notice 部署合约，绑定链 Y 的 Vault 合约地址
     * @param initialVaultAddress 链 Y Vault 合约地址（不可为零地址）
     */
    constructor(
        address initialVaultAddress
    ) ReentrancyGuard() Ownable(msg.sender) {
        require(initialVaultAddress != address(0), "Invalid initial vault address");
        vaultAddress = initialVaultAddress;
        emit VaultAddressUpdated(address(0), initialVaultAddress);
    }

    /**
     * @notice 更新链 Y Vault 合约地址（仅 Owner）
     * @param newVaultAddress 新的 Vault 合约地址
     */
    function setVaultAddress(address newVaultAddress) external onlyOwner {
        require(newVaultAddress != address(0), "Invalid vault address");
        address oldVault = vaultAddress;
        vaultAddress = newVaultAddress;
        emit VaultAddressUpdated(oldVault, newVaultAddress);
    }

    /**
     * @notice 根据链 Y 的跨链消息在链 X 上同步创建拍卖
     * @dev 流程：解码跨链数据 → 解析 receipt 中的 AuctionCreated 事件 →
     *      ecrecover 验证发送者 → 校验 auctionId 绑定关系 → 写入拍卖状态
     *
     *      auctionId = keccak256(sender, sourceChainId, vaultAddress, activeAuctionCount)
     *      恶意 sender 无法伪造其他 sender 的 auctionId，也无法跨链重放
     *
     * @param crossChainMessage ABI 编码的 CrossChainData（sourceChainId, rawTransaction, rawRecpt）
     */
    function createAuction(bytes memory crossChainMessage) external {
        CrossChainData memory ccData = abi.decode(crossChainMessage, (CrossChainData));

        TransactionParser.RawTransaction memory rawTx = TransactionParser
            .parseRawTransaction(ccData.rawTransaction);
        TransactionParser.RecptLog memory log = TransactionParser.parseRecptLog(
            ccData.rawRecpt
        );

        /// @dev indexed 参数在 topic 中，非 indexed 在 eventData 中
        uint256 auctionId = uint256(log.topics[1]);
        uint32 auctionType;
        uint256 activeAuctionCount;
        uint256 revealStartTime;
        uint256 bidPeriod;
        uint256 revealPeriod;

        (auctionType, activeAuctionCount, revealStartTime, bidPeriod, revealPeriod) = abi.decode(
            log.eventData,
            (uint32, uint256, uint256, uint256, uint256)
        );
        require(auctionId != 0, "Invalid auction, auctionID=0");
        console.log("activeAuctionCount:", activeAuctionCount);

        address sender = signerRecover(rawTx);

        uint256 auctionCheckId = uint256(
            keccak256(
                abi.encodePacked(sender, ccData.sourceChainId, vaultAddress, activeAuctionCount)
            )
        );

        console.log("auctionCheckId:", auctionCheckId);
        console.log("auctionId:", auctionId);
        require(auctionCheckId == auctionId, "Invalid auctionId");

        auctions[auctionId].chainid = ccData.sourceChainId;
        auctions[auctionId].auctionType = auctionType;
        auctions[auctionId].revealTime = revealStartTime + bidPeriod;
        auctions[auctionId].bidPeriod = bidPeriod;
        auctions[auctionId].revealPeriod = revealPeriod;
        auctions[auctionId].isActive = true;

        emit AuctionCreated(auctionId, auctionType, auctions[auctionId].revealTime);
    }

    // ─────────────────────────────────────────────
    //  Vault 注册（卖方）
    // ─────────────────────────────────────────────

    /**
     * @notice 卖方注册 vault 并验证锁仓合法性
     * @dev 必须在竞价期内调用。验证 keccak256(value, salt) == vaultSecretHash，
     *      同时将 msg.sender 绑定为该 vault 的卖方（用于后续 withdraw 身份校验）。
     *      vaultId 由 (chainid, vaultAddress, auctionId, sellerOnChainY, vaultSecretHash, auctionType) 哈希生成，
     *      与链 Y 的 lockId 保持一致。
     *
     * @param auctionId       拍卖 ID
     * @param sellerOnChainY  卖方在链 Y 上的地址（用于 vaultId 计算）
     * @param vaultSecretHash 锁仓 secret hash（来自链 Y 的 lockTokens）
     * @param value           锁仓的真实代币价值
     * @param salt            生成 secretHash 时使用的盐值
     */
    function verifySeller(
        uint256 auctionId,
        address sellerOnChainY,
        bytes32 vaultSecretHash,
        uint256 value,
        bytes32 salt
    ) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.revealTime, "Bid period ended");

        bytes32 vaultId = keccak256(
            abi.encodePacked(
                auction.chainid, vaultAddress, auctionId,
                sellerOnChainY, vaultSecretHash, auction.auctionType
            )
        );

        require(
            keccak256(abi.encodePacked(value, salt)) == vaultSecretHash,
            "Invalid reveal, hash mismatch"
        );

        Vault storage vault = auction.vaults[vaultId];
        require(!vault.exists, "Vault already registered");

        vault.exists = true;
        vault.vaultSecretHash = vaultSecretHash;
        vault.value = value;
        vault.salt = salt;
        vault.seller = msg.sender;

        emit VaultRegistered(auctionId, vaultId, msg.sender, value);
    }

    // ─────────────────────────────────────────────
    //  竞价 & 揭示
    // ─────────────────────────────────────────────

    /**
     * @notice 竞标者出价（一个 bidder 对一个 auction 只能出价一次）
     * @dev 必须在竞价期内调用。msg.value 作为押金质押，需 >= 后续揭示的真实出价。
     *
     * @param auctionId     拍卖 ID
     * @param bidSecretHash 出价承诺哈希（密封竞价时使用，= keccak256(value, salt)）
     */
    function placeBid(
        uint256 auctionId,
        bytes32 bidSecretHash
    ) external payable {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.revealTime, "Bid period ended");

        Bid storage bid = auction.bids[msg.sender];
        require(bid.depositAmount == 0, "Already bid on this auction");

        bid.bidSecretHash = bidSecretHash;
        bid.isSealed = isSealedAuction(auction.auctionType);
        bid.depositAmount = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /**
     * @notice 竞标者揭示真实出价，合约自动更新拍卖最高价
     * @dev 必须在揭示期内调用。密封竞价模式下验证 keccak256(value, salt) == bidSecretHash。
     *      若 value > 当前最高出价，自动更新 auction.highestBidder 和 auction.highestBid。
     *
     * @param auctionId 拍卖 ID
     * @param value     真实出价金额
     * @param salt      生成 bidSecretHash 时使用的盐值
     */
    function revealBid(
        uint256 auctionId,
        uint256 value,
        bytes32 salt
    ) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp >= auction.revealTime, "Reveal period not started");
        require(block.timestamp < auction.revealTime + auction.revealPeriod, "Reveal period ended");

        Bid storage bid = auction.bids[msg.sender];
        require(bid.depositAmount > 0, "No bid found");
        require(!bid.isRevealed, "Bid already revealed");

        if (bid.isSealed) {
            require(
                keccak256(abi.encodePacked(value, salt)) == bid.bidSecretHash,
                "Invalid bid reveal"
            );
        }

        bid.bidValue = value;
        bid.isRevealed = true;

        if (value > auction.highestBid) {
            auction.highestBidder = msg.sender;
            auction.highestBid = value;
        }

        emit BidRevealed(auctionId, msg.sender, value);
    }

    // ─────────────────────────────────────────────
    //  结算
    // ─────────────────────────────────────────────

    /**
     * @notice 结算拍卖（揭示期结束后，任何人可调用）
     * @dev 标记 auction.isSettled = true，锁定 highestBidder/highestBid。
     *      结算后卖方可调用 withdrawMatchResult 提取资金，
     *      非中标者可调用 claimBidDeposit 取回押金。
     *
     * @param auctionId 拍卖 ID
     */
    function settleAuction(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(!auction.isSettled, "Already settled");

        uint256 settleTime = auction.revealTime + auction.revealPeriod;
        if (block.timestamp < settleTime) {
            revert RevealPeriodNotEnded(auctionId, block.timestamp, settleTime);
        }

        auction.isSettled = true;
        emit AuctionSettled(auctionId, auction.highestBidder, auction.highestBid);
    }

    // ─────────────────────────────────────────────
    //  资金提取
    // ─────────────────────────────────────────────

    /**
     * @notice 卖方提取 vault 的结算资金
     * @dev 前置条件：拍卖已结算 + 调用者是 vault 的注册卖方。
     *      若有中标者：从中标者的 deposit 中扣除 highestBid 并转给卖方。
     *      若无中标者（highestBidder = address(0)）：仅标记已提取。
     *      提取完成后通过 MatchResultWithdrawn 事件触发链 Y 的 unlockTokens。
     *
     * @param auctionId 拍卖 ID
     * @param vaultId   vault ID
     */
    function withdrawMatchResult(
        uint256 auctionId,
        bytes32 vaultId
    ) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        if (!auction.isActive) {
            revert AuctionNotActive(auctionId);
        }
        if (!auction.isSettled) {
            revert AuctionNotSettled(auctionId);
        }

        Vault storage vault = auction.vaults[vaultId];
        if (!vault.exists) {
            revert VaultDoesNotExist(auctionId, vaultId);
        }
        require(msg.sender == vault.seller, "Not the seller");
        require(!vault.isWithdrawn, "Already withdrawn");

        vault.isWithdrawn = true;

        uint256 transferAmount = 0;
        if (auction.highestBidder != address(0)) {
            Bid storage winnerBid = auction.bids[auction.highestBidder];
            transferAmount = auction.highestBid;
            require(winnerBid.depositAmount >= transferAmount, "Insufficient deposit");
            winnerBid.depositAmount -= transferAmount;
            payable(msg.sender).transfer(transferAmount);
        }

        emit MatchResultWithdrawn(auctionId, vaultId, msg.sender, transferAmount);
    }

    // ─────────────────────────────────────────────
    //  押金管理
    // ─────────────────────────────────────────────

    /**
     * @notice 竞标者提取剩余押金
     * @dev 前置条件：拍卖已结算。中标者的押金已在 withdrawMatchResult 中扣除，
     *      此处退回剩余部分；非中标者取回全额押金。
     *
     * @param auctionId 拍卖 ID
     */
    function claimBidDeposit(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        if (!auction.isSettled) {
            revert AuctionNotSettled(auctionId);
        }

        Bid storage bid = auction.bids[msg.sender];
        require(bid.depositAmount > 0, "No deposit to claim");

        uint256 amount = bid.depositAmount;
        bid.depositAmount = 0;
        payable(msg.sender).transfer(amount);
    }

    // ─────────────────────────────────────────────
    //  查询
    // ─────────────────────────────────────────────

    /**
     * @notice 查询拍卖信息
     * @param auctionId 拍卖 ID
     * @return isActive       是否激活
     * @return isSettled       是否已结算
     * @return revealTime      竞价截止时间
     * @return bidPeriod       竞价期时长（秒）
     * @return revealPeriod    揭示期时长（秒）
     * @return highestBidder   最高出价者
     * @return highestBid      最高出价
     */
    function getAuctionInfo(
        uint256 auctionId
    ) external view returns (
        bool isActive,
        bool isSettled,
        uint256 revealTime,
        uint256 bidPeriod,
        uint256 revealPeriod,
        address highestBidder,
        uint256 highestBid
    ) {
        Auction storage a = auctions[auctionId];
        return (a.isActive, a.isSettled, a.revealTime, a.bidPeriod, a.revealPeriod, a.highestBidder, a.highestBid);
    }

    /**
     * @notice 查询 vault 的完整状态
     * @param auctionId 拍卖 ID
     * @param vaultId   vault ID
     * @return exists          是否存在
     * @return vaultSecretHash 锁仓承诺哈希
     * @return value           锁仓真实价值
     * @return seller          卖方地址（链 X）
     * @return isWithdrawn     是否已提取
     */
    function getVaultInfo(
        uint256 auctionId,
        bytes32 vaultId
    ) external view returns (
        bool exists,
        bytes32 vaultSecretHash,
        uint256 value,
        address seller,
        bool isWithdrawn
    ) {
        Vault storage v = auctions[auctionId].vaults[vaultId];
        return (v.exists, v.vaultSecretHash, v.value, v.seller, v.isWithdrawn);
    }

    /**
     * @notice 查询竞标者的出价信息
     * @param auctionId 拍卖 ID
     * @param bidder    竞标者地址
     * @return bidValue      揭示后的真实出价
     * @return isRevealed    是否已揭示
     * @return depositAmount 剩余押金
     */
    function getBidInfo(
        uint256 auctionId,
        address bidder
    ) external view returns (
        uint256 bidValue,
        bool isRevealed,
        uint256 depositAmount
    ) {
        Bid storage b = auctions[auctionId].bids[bidder];
        return (b.bidValue, b.isRevealed, b.depositAmount);
    }

    // ─────────────────────────────────────────────
    //  内部函数
    // ─────────────────────────────────────────────

    /**
     * @dev 从跨链原始交易中恢复发送者地址（EIP-155 签名）
     * @param rawTx 解析后的原始交易结构体
     * @return sender 交易发送者地址
     */
    function signerRecover(TransactionParser.RawTransaction memory rawTx) internal pure returns (address sender) {
        uint8 vAdj = uint8(rawTx.v);
        if (vAdj >= 35) {
            vAdj = 27 + uint8((vAdj - 35) % 2);
        }
        uint256 chainIdSig = 0;
        if (rawTx.v >= 35) {
            chainIdSig = (uint256(rawTx.v) - 35) / 2;
        }

        bytes[] memory payload = new bytes[](9);
        payload[0] = _encodeUint(rawTx.nonce);
        payload[1] = _encodeUint(rawTx.gasPrice);
        payload[2] = _encodeUint(rawTx.gasLimit);
        payload[3] = _encodeAddress(rawTx.to);
        payload[4] = _encodeUint(rawTx.value);
        payload[5] = _encodeBytes(rawTx.data);
        payload[6] = _encodeUint(chainIdSig);
        payload[7] = _encodeUint(0);
        payload[8] = _encodeUint(0);

        bytes32 txHash = keccak256(_encodeList(payload));
        sender = ecrecover(txHash, vAdj, rawTx.r, rawTx.s);
        console.logBytes32(txHash);
        console.log("vAdj:", vAdj);
        console.log("chainID:", chainIdSig);
        console.log("sender address:", sender);
    }

    /**
     * @dev 调试用：解析原始交易并返回恢复的签名者及交易字段
     * @param rawTransaction RLP 编码的原始交易字节
     */
    function debugRecover(
        bytes memory rawTransaction
    )
        external
        pure
        returns (
            address signer,
            bytes32 txHash,
            uint256 chainIdSig,
            uint8 vAdj,
            uint256 nonce,
            uint256 gasPrice,
            uint256 gasLimit,
            uint256 value
        )
    {
        TransactionParser.RawTransaction memory rawTx = TransactionParser
            .parseRawTransaction(rawTransaction);

        vAdj = uint8(rawTx.v);
        if (vAdj >= 35) {
            vAdj = 27 + uint8((vAdj - 35) % 2);
            chainIdSig = (uint256(rawTx.v) - 35) / 2;
        }

        nonce = rawTx.nonce;
        gasPrice = rawTx.gasPrice;
        gasLimit = rawTx.gasLimit;
        value = rawTx.value;

        bytes[] memory payload = new bytes[](9);
        payload[0] = _encodeUint(rawTx.nonce);
        payload[1] = _encodeUint(rawTx.gasPrice);
        payload[2] = _encodeUint(rawTx.gasLimit);
        payload[3] = _encodeAddress(rawTx.to);
        payload[4] = _encodeUint(rawTx.value);
        payload[5] = _encodeBytes(rawTx.data);
        payload[6] = _encodeUint(chainIdSig);
        payload[7] = _encodeUint(0);
        payload[8] = _encodeUint(0);

        txHash = keccak256(_encodeList(payload));
        signer = ecrecover(txHash, vAdj, rawTx.r, rawTx.s);
    }

    /// @dev 判断是否为密封竞价（auctionType 低 8 位全为 1）
    function isSealedAuction(uint32 auctionType) internal pure returns (bool) {
        return (auctionType & 0x000000FF) == 0x000000FF;
    }

    // ─────────────────────────────────────────────
    //  RLP 编码辅助（最小实现，用于 ecrecover）
    // ─────────────────────────────────────────────

    /// @dev RLP 编码 uint256
    function _encodeUint(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) {
            return hex"80";
        }
        bytes memory b = _toMinimalBytes(value);
        if (b.length == 1 && uint8(b[0]) < 0x80) {
            return b;
        }
        return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
    }

    /// @dev RLP 编码 address（固定 20 字节）
    function _encodeAddress(address addr) internal pure returns (bytes memory) {
        bytes memory b = abi.encodePacked(addr);
        return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
    }

    /// @dev RLP 编码任意 bytes
    function _encodeBytes(bytes memory data) internal pure returns (bytes memory) {
        if (data.length == 1 && uint8(data[0]) < 0x80) {
            return data;
        }
        if (data.length <= 55) {
            return abi.encodePacked(bytes1(uint8(0x80 + data.length)), data);
        }
        bytes memory lenBytes = _toMinimalBytes(data.length);
        return abi.encodePacked(bytes1(uint8(0xb7 + lenBytes.length)), lenBytes, data);
    }

    /// @dev RLP 编码列表
    function _encodeList(bytes[] memory list) internal pure returns (bytes memory) {
        uint256 totalLen;
        for (uint256 i = 0; i < list.length; i++) {
            totalLen += list[i].length;
        }

        bytes memory payload;
        if (totalLen <= 55) {
            payload = abi.encodePacked(bytes1(uint8(0xc0 + totalLen)));
        } else {
            bytes memory lenBytes = _toMinimalBytes(totalLen);
            payload = abi.encodePacked(bytes1(uint8(0xf7 + lenBytes.length)), lenBytes);
        }

        for (uint256 i = 0; i < list.length; i++) {
            payload = abi.encodePacked(payload, list[i]);
        }
        return payload;
    }

    /// @dev uint256 转最小字节表示（大端序）
    function _toMinimalBytes(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) {
            return hex"00";
        }
        uint256 temp = value;
        uint256 len;
        while (temp != 0) {
            len++;
            temp >>= 8;
        }
        bytes memory out = new bytes(len);
        for (uint256 i = len; i > 0; i--) {
            out[i - 1] = bytes1(uint8(value));
            value >>= 8;
        }
        return out;
    }
}
