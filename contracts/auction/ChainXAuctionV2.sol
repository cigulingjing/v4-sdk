// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/TransactionParser.sol";
import "./libraries/EventParser.sol";
import "hardhat/console.sol";

contract ChainXAuctionV2 is ReentrancyGuard, Ownable {
    // ============ 状态变量 ============
    address public vaultAddress;
    mapping(uint256 => Auction) public auctions;

    // Auction Start: Auction | REVEAL_PERIOD_SECRECT | REVEAL_PERIOD_BID | CHALLENGE_PERIOD | WITHDRAW_PERIOD | End
    uint256 public constant CHALLENGE_PERIOD = 1 hours;
    uint256 public constant REVEAL_PERIOD_SECRECT = 1 hours;
    uint256 public constant REVEAL_PERIOD_BID = 1 hours;
    uint256 public constant WITHDRAW_PERIOD = 1 hours;

    // ============ 结构体定义 ============
    struct Vault {
        bool exists;
        address seller; // 卖家
        uint256 revealTime; // 实际的揭示时间，并代表isRevealed(e.g. lockInfo.revealTime == 0)
        bytes32 vaultSecretHash;
        uint256 value;
        bytes32 salt;
    }

    struct Bid {
        bytes32 bidSecretHash;
        uint256 bidValue;
        bool isSealed;
        bytes32[] targetVaults; // 一个bid可以对应多个vault，即竞标多个资产
        uint256 revealTime;
        uint256 depositAmount;
    }

    struct Auction {
        uint256 chainid;
        uint32 auctionType; // 竞标类型
        uint256 revealTime;
        bool isActive; // 是否激活
        mapping(bytes32 => Vault) vaults;
        uint256 vaultCount;
        mapping(address => Bid) auctionBid;
        uint256 bidCount;
        mapping(bytes32 => address) vaultToBidder;
        mapping(address => MatchResult) auctionMatches; // 修改: 从 lockId 改为 bidder 作为 key
        uint256 challengeEndTime; // 挑战期结束时间
        mapping(address => mapping(bytes32 => bool)) sellerLocks; // 新增: seller -> lockId -> exists
    }

    // 跨链数据，包含原始交易和收据
    struct CrossChainData {
        uint256 sourceChainId;
        bytes rawTransaction;
        bytes rawRecpt;
    }

    struct MatchResult {
        bytes32 vaultId; // 新增: 记录对应的 lockId
        uint256 bidValue; // 新增: 记录中标金额
        bool isChallenged;
        bool isWithdrawn;
    }

    // ============ 事件定义 ============
    event AuctionCreated(
        uint256 indexed auctionId,
        uint32 auctionType,
        uint256 endTime
    );
    event LockRevealed(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        uint256 revealTime
    );
    event BidPlaced(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        address indexed bidder,
        uint256 depositAmount
    );
    event BidRevealed(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 bidRevealValue
    );
    event MatchResultSubmitted(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        address indexed bidder,
        uint256 bidValue
    );
    event MatchResultChallenged(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        address indexed challenger,
        string reason
    );
    event MatchResultWithdrawn(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        address indexed recipient,
        uint256 amount
    );
    event LockCreated(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        uint256 revealTime
    );
    event BidUpdated(
        uint256 indexed auctionId,
        bytes32 indexed lockId,
        address indexed bidder
    );
    event VaultAddressUpdated(
        address indexed oldVault,
        address indexed newVault
    );

    // ============ 拍卖核心功能 ============
    constructor(
        address initialVaultAddress
    ) ReentrancyGuard() Ownable(msg.sender) {
        require(
            initialVaultAddress != address(0),
            "Invalid initial vault address"
        );
        vaultAddress = initialVaultAddress;
        emit VaultAddressUpdated(address(0), initialVaultAddress);
    }

    function setVaultAddress(address newVaultAddress) external onlyOwner {
        require(newVaultAddress != address(0), "Invalid vault address");
        address oldVault = vaultAddress;
        vaultAddress = newVaultAddress;
        emit VaultAddressUpdated(oldVault, newVaultAddress);
    }

    // 盘古上部署 X
    // Y 拍卖 auction，
    // X 上同步启动，X开始竞价 ETH
    function createAuction(bytes memory crossChainMessage) external {
        // 无需验证，直接反向传输
        CrossChainData memory ccData = abi.decode(
            crossChainMessage,
            (CrossChainData)
        );

        // 解析原始交易
        TransactionParser.RawTransaction memory rawTx = TransactionParser
            .parseRawTransaction(ccData.rawTransaction);
        TransactionParser.RecptLog memory log = TransactionParser.parseRecptLog(
            ccData.rawRecpt
        );

        // 解析拍卖参数
        uint256 auctionId = uint256(log.topics[1]); // auctionID 是 indexed修饰因此再topic中。
        uint32 auctionType;
        uint256 activeAuctionCount;
        uint256 revealStartTime;

        (auctionType, activeAuctionCount, revealStartTime) = abi.decode(
            log.eventData,
            (uint32, uint256, uint256)
        );
        require(auctionId != 0, "Invalid auction, auctionID=0");
        console.log("activeAuctionCount:", activeAuctionCount);

        // ! 版本1：解析拍卖参数
        //  (uint256 auctionId, uint32 auctionType, uint256 nonce, uint256 revealStartTime) = EventParser.parseAuctionCreatedEvent(log.eventData);

        // 校验auctionId与message sender的绑定关系
        // 恶意sender无法伪造其他sender的auctionId
        // 恶意sender无法在其他链重放自己的auction
        uint8 vAdj = uint8(rawTx.v);
        if (vAdj >= 35) {
            vAdj = 27 + uint8((vAdj - 35) % 2); // normalize EIP-155 v to 27/28
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
        address sender = ecrecover(txHash, vAdj, rawTx.r, rawTx.s);

        console.logBytes32(txHash);
        console.log("vAdj:", vAdj);
        console.log("sender address:", sender);
    


        uint256 auctionCheckId = uint256(
            keccak256(
                abi.encodePacked(
                    sender,
                    ccData.sourceChainId,
                    vaultAddress,
                    activeAuctionCount
                )
            )
        );

        console.log("auctionCheckId:", auctionCheckId);
        console.log("auctionId:", auctionId);

        require(auctionCheckId == auctionId, "Invalid auctionId");

        auctions[auctionId].chainid = ccData.sourceChainId;
        auctions[auctionId].auctionType = auctionType;
        auctions[auctionId].revealTime =
            revealStartTime +
            REVEAL_PERIOD_SECRECT;
        auctions[auctionId].isActive = true;
        auctions[auctionId].challengeEndTime =
            revealStartTime +
            REVEAL_PERIOD_SECRECT +
            REVEAL_PERIOD_BID +
            CHALLENGE_PERIOD;

        emit AuctionCreated(
            auctionId,
            auctionType,
            auctions[auctionId].revealTime
        );
    }

    // 调试接口：根据 rawTx 计算恢复的签名者
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

    function placeBid(
        uint256 auctionId,
        address seller,
        bytes32 vaultSecretHash,
        bytes32 bidSecretHash
    ) external payable {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.revealTime, "Auction ended");

        // auction可以支持多个vault竞标，每个vault对应一个lockId
        bytes32 targetLockId = keccak256(
            abi.encodePacked(
                auction.chainid,
                vaultAddress,
                auctionId,
                seller,
                vaultSecretHash,
                auction.auctionType
            )
        );

        if (!auction.vaults[targetLockId].exists) {
            Vault storage newLock = auction.vaults[targetLockId];
            newLock.exists = true;
            newLock.seller = seller;
            newLock.vaultSecretHash = vaultSecretHash;
            auction.vaultCount++;
            emit LockCreated(auctionId, targetLockId, auction.revealTime);
        }

        if (auction.auctionBid[msg.sender].revealTime == 0) {
            console.log("New bid from bidder:", msg.sender);
            Bid storage newBid = auction.auctionBid[msg.sender];
            newBid.bidSecretHash = bidSecretHash;
            newBid.isSealed = isSealedAuction(auction.auctionType);
            newBid.targetVaults.push(targetLockId);
            newBid.revealTime =
                auction.revealTime +
                REVEAL_PERIOD_SECRECT +
                REVEAL_PERIOD_BID;
            newBid.depositAmount = msg.value; // Bid出价时质押的值，需要比真实出价值高，bid结束后，可以通过claim提取未使用部分

            console.log("Deposit amount:", msg.value);
            emit BidPlaced(auctionId, targetLockId, msg.sender, msg.value);
        } else {
            // 已经出价bid，但是可以追加竞标多个vault
            console.log("Old bid from bidder:", msg.sender);
            Bid storage existingBid = auction.auctionBid[msg.sender];
            existingBid.targetVaults.push(targetLockId);
            emit BidUpdated(auctionId, targetLockId, msg.sender);
        }
    }

    // 卖方揭示Lock信息，通过公开value和salt证明其secretHash的正确性。
    function revealLock(
        uint256 auctionId,
        bytes32 lockId,
        uint256 value,
        bytes32 salt
    ) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.revealTime, "Auction ended");

        Vault storage lockInfo = auction.vaults[lockId];
        require(lockInfo.exists, "Lock does not exist");
        // 必须限定卖方才可以揭示。
        require(
            lockInfo.seller == msg.sender,
            "Lock is not for the current user"
        );
        require(lockInfo.revealTime == 0, "Lock already revealed");
        require(
            keccak256(abi.encodePacked(value, salt)) ==
                lockInfo.vaultSecretHash,
            "Invalid lock reveal, hash secret is not match"
        );

        lockInfo.revealTime = block.timestamp;
        lockInfo.value = value;
        lockInfo.salt = salt;
        auction.vaultCount++;

        emit LockRevealed(auctionId, lockId, block.timestamp);
    }

    // 竞标者揭示bid信息
    function revealBid(
        uint256 auctionId,
        uint256 value,
        bytes32 salt
    ) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        Bid storage bid = auction.auctionBid[msg.sender];
        require(bid.bidValue == 0, "Bid already revealed");

        if (bid.isSealed) {
            // 密封竞标,需要验证hash
            require(block.timestamp < bid.revealTime, "Bid reveal time ended");
            require(
                keccak256(abi.encodePacked(value, salt)) == bid.bidSecretHash,
                "Invalid bid reveal"
            );
        }
        bid.bidValue = value;
        bid.revealTime = block.timestamp;
        auction.bidCount++;
        emit BidRevealed(auctionId, msg.sender, bid.bidValue);
    }

    // 卖家未揭示，出价方可提取押金
    function claimBidDepositAfterReveal(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(
            block.timestamp > auction.revealTime,
            "Reveal period not ended"
        );
        require(auction.auctionType == 0, "Auction is not a sealed auction");

        // bid.bidLocks所有对应的locks均未reveal
        Bid storage bid = auction.auctionBid[msg.sender];
        for (uint256 i = 0; i < bid.targetVaults.length; i++) {
            bytes32 vaultId = bid.targetVaults[i];
            require(
                auction.vaults[vaultId].salt != bytes32(0),
                "Vault is not revealed"
            );
        }

        uint256 depositAmount = bid.depositAmount;
        bid.depositAmount = 0;
        payable(msg.sender).transfer(depositAmount);
    }

    function claimBidDepositAfterChallenge(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(
            block.timestamp > auction.challengeEndTime,
            "Challenge period not ended"
        );
        // 判断bid可提取，未竞价成功
        require(
            auction.auctionMatches[msg.sender].isChallenged ||
                auction.auctionMatches[msg.sender].vaultId == bytes32(0),
            "Bid is challenged or not win the auction"
        );

        Bid storage bid = auction.auctionBid[msg.sender];
        uint256 depositAmount = bid.depositAmount;
        bid.depositAmount = 0;
        payable(msg.sender).transfer(depositAmount);
    }

    function claimBidDepositAfterWithdraw(uint256 auctionId) external {
        Auction storage auction = auctions[auctionId];
        require(
            block.timestamp > auction.challengeEndTime + WITHDRAW_PERIOD,
            "Withdraw period not ended"
        );

        Bid storage bid = auction.auctionBid[msg.sender];
        uint256 depositAmount = bid.depositAmount;
        bid.depositAmount = 0;
        payable(msg.sender).transfer(depositAmount);
    }

    // 缺少步骤：竞标成功的判断在链上不好做？如果是简单的价高者可以实现，但是复杂逻辑链上实现复杂。
    // 如果要实现竞标成功判断？ 挑战机制，链外计算
    // submitMatchResults 只负责拍卖结果上传（已经确定好中标人以后的操作）

    // ============ 匹配结果管理 ============
    function submitMatchResults(
        uint256 auctionId,
        bytes32[] calldata lockIds,
        address[] calldata bidders,
        uint256[] calldata finalValues
    ) external {
        require(
            lockIds.length == bidders.length &&
                bidders.length == finalValues.length,
            "Length mismatch"
        );

        Auction storage auction = auctions[auctionId];
        require(lockIds.length == auction.vaultCount, "Count mismatch");
        require(auction.isActive, "Auction not active");
        require(
            block.timestamp >= auction.revealTime + REVEAL_PERIOD_BID,
            "Bid reveal period not ended"
        );

        for (uint256 i = 0; i < lockIds.length; i++) {
            bytes32 lockId = lockIds[i];
            address bidder = bidders[i];
            uint256 finalValue = finalValues[i];
            require(auction.vaults[lockId].exists, "Invalid lock ID");
            require(
                auction.vaults[lockId].revealTime == 0,
                "Lock not revealed"
            );

            auction.auctionMatches[bidder] = MatchResult({
                vaultId: lockId,
                isChallenged: false,
                isWithdrawn: false,
                bidValue: finalValue
            });

            auction.vaultToBidder[lockId] = bidder;

            emit MatchResultSubmitted(auctionId, lockId, bidder, finalValue);
        }
    }

    function challengeMatchResult(uint256 auctionId, address bidder) external {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(
            block.timestamp < auction.challengeEndTime,
            "Challenge period ended"
        );

        MatchResult storage matching = auction.auctionMatches[bidder];
        require(!matching.isChallenged, "Already challenged");

        // todo: 如何进行挑战？

        matching.isChallenged = true;
        emit MatchResultChallenged(auctionId, matching.vaultId, msg.sender, "");
    }

    // 提现方法，挑战期结束以后执行。 lockID来源于创建Auction时候的秘密值，需要通过ChainY的提款日志获取
    // 通过withdrawMatchResult来触发chainYVaultV2的unlock
    function withdrawMatchResult(
        uint256 auctionId,
        bytes32 vaultId
    ) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(
            block.timestamp >= auction.challengeEndTime,
            "Challenge period not ended"
        );

        address bidder = auction.vaultToBidder[vaultId];
        uint256 transferAmount = 0;
        Vault storage vaultInfo = auction.vaults[vaultId];
        require(vaultInfo.exists, "Vault does not exist");

        if (vaultInfo.revealTime == 0) {
            // 没有揭示，返还给vault
            bidder = vaultAddress;
        } else if (bidder != address(0)) {
            MatchResult storage matching = auction.auctionMatches[bidder];
            require(!matching.isChallenged, "Match was challenged");
            require(!matching.isWithdrawn, "Already withdrawn");

            Bid storage bid = auction.auctionBid[bidder];
            bid.depositAmount -= transferAmount;
            require(bid.depositAmount >= 0, "Deposit amount is negative");

            transferAmount = matching.bidValue;
            payable(msg.sender).transfer(transferAmount);
            matching.isWithdrawn = true;
        }
        // else {} bidder = address(0)

        emit MatchResultWithdrawn(auctionId, vaultId, bidder, transferAmount);
    }

    // ============ 查询功能 ============
    function getLockInfo(
        uint256 auctionId,
        bytes32 lockId
    ) external view returns (bool exists, uint256 revealTime, bytes32 secret) {
        Vault memory lockInfo = auctions[auctionId].vaults[lockId];
        return (
            lockInfo.exists,
            lockInfo.revealTime,
            keccak256(abi.encodePacked(lockInfo.value, lockInfo.salt))
        );
    }

    function getMatchResult(
        uint256 auctionId,
        address bidder
    )
        external
        view
        returns (
            bytes32 lockId, // 修改返回值顺序
            bool isChallenged,
            bool isWithdrawn
        )
    {
        MatchResult storage matching = auctions[auctionId].auctionMatches[
            bidder
        ];
        return (matching.vaultId, matching.isChallenged, matching.isWithdrawn);
    }

    // ============ 内部功能 ============
    // 是否为秘密竞拍
    function isSealedAuction(uint32 auctionType) internal pure returns (bool) {
        return (auctionType & 0x000000FF) == 0x000000FF;
    }

    // ============ RLP helpers (minimal encode) ============
    function _encodeUint(uint256 value) internal pure returns (bytes memory) {
        if (value == 0) {
            return hex"80"; // empty string per RLP for zero
        }
        bytes memory b = _toMinimalBytes(value);
        if (b.length == 1 && uint8(b[0]) < 0x80) {
            return b; // single byte, no length prefix
        }
        return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
    }

    function _encodeAddress(address addr) internal pure returns (bytes memory) {
        bytes memory b = abi.encodePacked(addr);
        return abi.encodePacked(bytes1(uint8(0x80 + b.length)), b);
    }

    function _encodeBytes(
        bytes memory data
    ) internal pure returns (bytes memory) {
        if (data.length == 1 && uint8(data[0]) < 0x80) {
            return data;
        }
        if (data.length <= 55) {
            return abi.encodePacked(bytes1(uint8(0x80 + data.length)), data);
        }
        bytes memory lenBytes = _toMinimalBytes(data.length);
        return
            abi.encodePacked(
                bytes1(uint8(0xb7 + lenBytes.length)),
                lenBytes,
                data
            );
    }

    function _encodeList(
        bytes[] memory list
    ) internal pure returns (bytes memory) {
        uint256 totalLen;
        for (uint256 i = 0; i < list.length; i++) {
            totalLen += list[i].length;
        }

        bytes memory payload;
        if (totalLen <= 55) {
            payload = abi.encodePacked(bytes1(uint8(0xc0 + totalLen)));
        } else {
            bytes memory lenBytes = _toMinimalBytes(totalLen);
            payload = abi.encodePacked(
                bytes1(uint8(0xf7 + lenBytes.length)),
                lenBytes
            );
        }

        for (uint256 i = 0; i < list.length; i++) {
            payload = abi.encodePacked(payload, list[i]);
        }
        return payload;
    }

    function _toMinimalBytes(
        uint256 value
    ) internal pure returns (bytes memory) {
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
