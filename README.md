
# V4-SDK

提供punk交易区合约以及对应的部署脚本、测试脚本，sdk调用脚本。

## 部署
|   依赖   |  版本      |
|   ----   | ----       |
|    nvm   |  0.39.7    |
|   npm    | v20.19.5  |

```bash

npm install

```

### 合约部署：

运行命令：
```shell
npx hardhat run scripts/deploy/deploy.ts
npx hardhat run scripts/deploy/inits.ts
```

## 测试
voucher测试通过

```shell
 npx hardhat test test/voucher.ts
```

## 测试记录


``` bash
## 判断链是否启动
➜ curl -s -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"web3_clientVersion","params":[]}' \
  http://127.0.0.1:8666
输出：
{"jsonrpc":"2.0","id":1,"result":"Geth/v1.13.12-unstable-7b9ff3fc-20260126/linux-amd64/go1.22.5"}

➜  v4-sdk git:(dev_lq) ✗ npx hardhat run scripts/auction/deploy.ts --network punk
Deployment Summary:
Coinbase Address: 0x0Ae15e8f240F0e05995da1Dda78403EC8FD13d9d
ChainYVaultV2 Address: 0x10348E0919cF66251a23C179093a078E00F77A8B
ChainXAuctionV2 Address: 0x322c9b5d6D18F611d6C0D545C631B158525d9DE0
```



## UniswapV4及hook部署使用

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
