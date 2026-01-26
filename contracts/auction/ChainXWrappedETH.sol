// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ChainXWrappedETH is ReentrancyGuard {
    enum TokenType { TRANSFER, TRADE }
    
    // 记录每个地址两种类型的余额
    mapping(address => uint256) public transferBalances;
    mapping(address => uint256) public tradeBalances;
    
    // 只允许存入 transfer 类型
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit ETH");
        
        transferBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    // 转账指定类型的代币
    function transfer(
        address to,
        uint256 amount,
        TokenType fromType,
        TokenType toType
    ) external nonReentrant returns (bool) {
        if (fromType == TokenType.TRANSFER) {
            require(transferBalances[msg.sender] >= amount, "Insufficient transfer balance");
            transferBalances[msg.sender] -= amount;
            
            // 如果目标类型是 TRADE，则转为 trade.ETH
            if (toType == TokenType.TRADE) {
                tradeBalances[to] += amount;
                emit Transfer(msg.sender, to, amount, TokenType.TRANSFER, TokenType.TRADE);
            } else {
                transferBalances[to] += amount;
                emit Transfer(msg.sender, to, amount, TokenType.TRANSFER, TokenType.TRANSFER);
            }
        } else {
            require(tradeBalances[msg.sender] >= amount, "Insufficient trade balance");
            tradeBalances[msg.sender] -= amount;
            
            // trade.ETH 只能转为 trans.ETH
            transferBalances[to] += amount;
            emit Transfer(msg.sender, to, amount, TokenType.TRADE, TokenType.TRANSFER);
        }
        
        return true;
    }
    
    // 只允许提取 transfer 类型的 ETH
    function withdraw(uint256 amount) external nonReentrant {
        require(transferBalances[msg.sender] >= amount, "Insufficient transfer balance");
        
        transferBalances[msg.sender] -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    // 查询地址的两种代币余额
    function balanceOf(address account) external view returns (uint256 transferBalance, uint256 tradeBalance) {
        return (transferBalances[account], tradeBalances[account]);
    }
    
    event Deposited(address indexed user, uint256 amount);
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        TokenType fromType,
        TokenType toType
    );
    event Withdrawn(address indexed user, uint256 amount);
    
    receive() external payable {}
} 