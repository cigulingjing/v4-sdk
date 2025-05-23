# UniswapV4及hook部署使用

1. 运行uniswapv4自带测试：
命令行输入`npx hardhat test`
2. 合约编译：`npx hardhat compile`
将必要的abi文件从`artifacts/contracts`移至`scripts/frontend/abi`
3. 部署uniswapv4合约以及hook合约：
    1. 运行本地区块链节点网络：`npx hardhat node`
    2. 配置文件,配置区块链网络、钱包以及合约地址：`scripts/frontend/lib/address.ts`
    3. hook合约部署脚本：`npx hardhat run scripts/frontend/depoly/depoly.ts`
        + 限价交易hook:`contracts/LimitOrder.sol`
        + 动态手续费hook:`contracts/DynamicFee.sol`

4. 初始化poolmanager合约：
运行初始化脚本：`npx hardhat run scripts/frontend/init/init.ts`

5. 合约调用：
    1. 市价交易：
        + 添加流动性：`npx hardhat run scripts/frontend/marketprice/addLiquidity.ts`
        + 交易：`npx hardhat run scripts/frontend/marketprice/swap.ts`
        + 撤销流动性：`npx hardhat run scripts/frontend/marketprice/removeLiquidity.ts`
    2. 限价交易：(接`添加流动性`操作，否则无法正常`挂单`)
        + 挂单：`npx hardhat run scripts/frontend/limitorder/place.ts`
        + [失败]撤单：`npx hardhat run scripts/frontend/limitorder/kill.ts`
        + [失败]提取流动性：`npx hardhat run scripts/frontend/limitorder/withdraw.ts`
    3. 动态手续费：
        + [存疑]调整手续费：`npx hardhat test scripts/feehook/testfeehook.ts`

## 待完成事项

+ 类似挖矿的流动性激励hook合约
