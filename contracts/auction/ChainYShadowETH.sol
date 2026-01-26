// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./utils/RLPReader.sol";
import "./ChainYLiquidityManager.sol";

contract ChainYShadowETH is ERC20, ReentrancyGuard {
    using RLPReader for bytes;
    using RLPReader for RLPReader.RLPItem;

    enum TokenType { TRANSFER, TRADE }
    
    // 状态变量
    mapping(bytes32 => bool) public processedReceipts;
    
    // Uniswap相关
    IUniswapV2Router02 public immutable router;
    IUniswapV2Pair public immutable pair;
    ChainYLiquidityManager public immutable liquidityManager;
    
    constructor(
        address _router,
        address payable _liquidityManager
    ) ERC20("Shadow ETH", "sETH") {
        router = IUniswapV2Router02(_router);
        liquidityManager = ChainYLiquidityManager(_liquidityManager);
        
        pair = IUniswapV2Pair(
            IUniswapV2Factory(router.factory()).getPair(address(this), router.WETH())
        );
    }
    
    // 主要的收据处理函数
    function handleReceipt(bytes memory receipt) external nonReentrant {
        require(verifyAndMarkReceipt(receipt), "Invalid proof");

        // 解析以太坊收据
        RLPReader.RLPItem[] memory items = receipt.toRlpItem().toList();
        require(items.length >= 4, "Invalid receipt format");
        
        // 解析日志数组
        bytes memory logs = items[3].toBytes();
        RLPReader.RLPItem[] memory logItems = logs.toRlpItem().toList();
        require(logItems.length > 0, "No logs found");
        
        // 遍历所有日志
        for(uint i = 0; i < logItems.length; i++) {
            RLPReader.RLPItem[] memory logParts = logItems[i].toList();
            require(logParts.length >= 3, "Invalid log format");
            
            // 获取事件主题和数据
            bytes32 eventTopic = bytes32(logParts[1].toUint());
            bytes memory eventData = logParts[2].toBytes();
            
            if (eventTopic == keccak256("Deposited(address,uint256)")) {
                (address user, uint256 amount) = abi.decode(
                    eventData,
                    (address, uint256)
                );
                handleDeposit(user, amount);
                
            } else if (eventTopic == keccak256("Transfer(address,address,uint256,uint8,uint8)")) {
                (
                    address from,
                    address to,
                    uint256 amount,
                    TokenType fromType,
                    TokenType toType
                ) = abi.decode(
                    eventData,
                    (address, address, uint256, TokenType, TokenType)
                );
                handleTransfer(from, to, amount, fromType, toType);
                
            } else if (eventTopic == keccak256("Withdrawn(address,uint256)")) {
                (address user, uint256 amount) = abi.decode(
                    eventData,
                    (address, uint256)
                );
                handleWithdraw(user, amount);
            }
        }
    }
    
    // 处理存款事件
    function handleDeposit(
        address user,
        uint256 amount
    ) internal {
        _mint(user, amount);
        emit ShadowMinted(user, amount);
    }
    
    // 处理转账事件
    function handleTransfer(
        address from,
        address to,
        uint256 amount,
        TokenType fromType,
        TokenType toType
    ) internal {        
        if (fromType == TokenType.TRANSFER && toType == TokenType.TRANSFER) {
            _transfer(from, to, amount);
        }
        else if (fromType == TokenType.TRANSFER && toType == TokenType.TRADE) {
            _approve(from, address(liquidityManager), amount);
            liquidityManager.addLiquidity{value: amount}(amount, to);
        }
        else if (fromType == TokenType.TRADE && toType == TokenType.TRANSFER) {
            uint256 liquidity = pair.balanceOf(from);
            require(liquidity >= amount, "Insufficient LP tokens");
            liquidityManager.removeLiquidity(liquidity, to);
        }
    }
    
    // 处理提现事件
    function handleWithdraw(
        address user,
        uint256 amount
    ) internal {
        _burn(user, amount);
        emit ShadowBurned(user, amount);
    }
    
    // 验证并标记收据
    function verifyAndMarkReceipt(bytes memory receipt) internal returns (bool) {
        bytes32 receiptHash = keccak256(receipt);
        
        require(!processedReceipts[receiptHash], "Receipt already processed");
        
        // todo
        
        processedReceipts[receiptHash] = true;
        return true;
    }
    
    // 接收ETH
    receive() external payable {}
    
    // 事件
    event ShadowMinted(address indexed user, uint256 amount);
    event ShadowBurned(address indexed user, uint256 amount);
} 