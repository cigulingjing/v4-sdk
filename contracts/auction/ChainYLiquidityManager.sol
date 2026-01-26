// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ChainYShadowETH.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract ChainYLiquidityManager {
    ChainYShadowETH public immutable shadowETH;
    IUniswapV2Router02 public immutable router;
    IUniswapV2Pair public immutable pair;
    
    constructor(address payable _shadowETH, address _router) {
        shadowETH = ChainYShadowETH(_shadowETH);
        router = IUniswapV2Router02(_router);
        
        // 初始化交易对
        pair = IUniswapV2Pair(
            IUniswapV2Factory(router.factory()).getPair(_shadowETH, router.WETH())
        );
    }
    
    function addLiquidity(
        uint256 amount,
        address to
    ) external payable {
        shadowETH.transferFrom(msg.sender, address(this), amount);
        shadowETH.approve(address(router), amount);
        
        router.addLiquidityETH{value: msg.value}(
            address(shadowETH),
            amount,
            amount * 99 / 100,
            msg.value * 99 / 100,
            to,
            block.timestamp
        );
    }
    
    function removeLiquidity(
        uint256 liquidity,
        address to
    ) external {
        require(pair.transferFrom(msg.sender, address(this), liquidity), "LP transfer failed");
        require(pair.approve(address(router), liquidity), "LP approve failed");
        
        router.removeLiquidityETH(
            address(shadowETH),
            liquidity,
            0,
            0,
            to,
            block.timestamp
        );
    }
    
    receive() external payable {}
} 