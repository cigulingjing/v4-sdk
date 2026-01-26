// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./utils/RLPReader.sol";
import "./utils/BytesLib.sol";

contract ChainXAuction is ReentrancyGuard {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;
    using BytesLib for bytes;
    
    struct Auction {
        uint256 amount;
        address seller;
        uint256 highestBid;
        address highestBidder;
        bytes32 secretHash;
        uint256 secretValue;
        uint256 endTime;
        bool isActive;
        bool isClaimed;
    }
    
    mapping(bytes32 => Auction) public auctions;
    
    event AuctionCreated(bytes32 indexed auctionId, uint256 endTime);
    event NewBid(bytes32 indexed auctionId, address bidder, uint256 amount);
    event AuctionFinalized(bytes32 indexed auctionId, address winner, uint256 amount);
    event AuctionCancelled(bytes32 indexed auctionId);

    struct CrossChainData {
        uint256 sourceChainId;
        bytes rawTransaction;
    }

    // 可更新的 ABI
    bytes public lockTokenABI;
    address public admin;

    constructor() {
        admin = msg.sender;
        // 初始化 lockToken 函数的 ABI
        lockTokenABI = abi.encodeWithSignature("lockTokens(bytes32,uint256)");
    }

    function updateLockTokenABI(bytes memory newABI) external {
        require(msg.sender == admin, "Only admin can update ABI");
        lockTokenABI = newABI;
    }

    struct RawTransaction {
        uint256 nonce;
        uint256 gasPrice;
        uint256 gasLimit;
        address to;
        uint256 value;
        bytes data;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function createAuction(bytes memory crossChainMessage) external {
        CrossChainData memory ccData = abi.decode(crossChainMessage, (CrossChainData));
        
        // 解析原始交易
        RawTransaction memory rawTx = parseRawTransaction(ccData.rawTransaction);
        
        // 解析 lockToken 调用数据
        require(rawTx.data.length >= 4, "Invalid function selector");
        bytes4 selector = bytes4(rawTx.data.slice(0, 4));
        require(bytes4(lockTokenABI.slice(0, 4)) == selector, "Invalid function");
        
        (bytes32 secretHash, uint256 expiration) = abi.decode(
            rawTx.data.slice(4, rawTx.data.length - 4),
            (bytes32, uint256)
        );

        address sender = ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(ccData.rawTransaction))),
            rawTx.v,
            rawTx.r,
            rawTx.s
        );

        // bytes32 auctionId = keccak256(ccData.rawTransaction);
        bytes32 auctionId = keccak256(abi.encodePacked(
            sender,
            secretHash,
            expiration
        ));
        
        require(!auctions[auctionId].isActive, "Auction already exists");
        require(rawTx.value > 0, "Amount must be greater than 0");
        
        auctions[auctionId] = Auction({
            amount: rawTx.value,
            seller: sender,
            highestBid: 0,
            highestBidder: address(0),
            secretHash: secretHash,
            secretValue: 0,
            endTime: expiration,
            isActive: true,
            isClaimed: false
        });
        
        emit AuctionCreated(auctionId, expiration);
    }

    function parseRawTransaction(bytes memory rawTx) internal pure returns (RawTransaction memory) {
        RLPReader.RLPItem[] memory items = rawTx.toRlpItem().toList();
        require(items.length == 9, "Invalid transaction format");

        return RawTransaction({
            nonce: items[0].toUint(),
            gasPrice: items[1].toUint(),
            gasLimit: items[2].toUint(),
            to: address(uint160(items[3].toUint())),
            value: items[4].toUint(),
            data: items[5].toBytes(),
            v: uint8(items[6].toUint()),
            r: bytes32(items[7].toUint()),
            s: bytes32(items[8].toUint())
        });
    }
    
    function placeBid(bytes32 auctionId) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value > auction.highestBid, "Bid too low");
        
        // 退还之前的最高出价
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }
        
        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        
        emit NewBid(auctionId, msg.sender, msg.value);
    }

    function finalizeAuction(bytes32 auctionId, bytes32 secret) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        require(auction.isActive, "Auction not active");
        require(!auction.isClaimed, "Auction already claimed");
        
        // 验证密钥
        if (keccak256(abi.encodePacked(secret)) == auction.secretHash) {
            // x 公开，直接完成拍卖
            auction.secretValue = uint256(secret);
            auction.isActive = false;
            auction.isClaimed = true;
            
            // 转账给卖家
            payable(auction.seller).transfer(auction.highestBid);
            
            emit AuctionFinalized(auctionId, auction.highestBidder, auction.highestBid);
        } else {
            // x 未公开且超时，退回竞拍金额
            require(block.timestamp > auction.endTime, "Auction not ended");
            
            auction.isActive = false;
            auction.isClaimed = true;
            
            // 退还最高出价
            if (auction.highestBidder != address(0)) {
                payable(auction.highestBidder).transfer(auction.highestBid);
            }
            
            emit AuctionCancelled(auctionId);
        }
    }    
} 