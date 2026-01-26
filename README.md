# Uniswap V4 Hook Deployment & Use cases

## 1. Run Uniswap V4 built-in tests

In [Uniswap V4 core](https://github.com/Uniswap/v4-core) repo:

```bash
npx hardhat test
```

## 2. Compile pool and hook contracts

In [Our Uniswap v4 periphery](https://github.com/tofudfy/v4-periphery) repo:

```bash
npx hardhat compile
```

Move the required ABI files from `artifacts/contracts` to [SDK repo](https://github.com/tofudfy/v4-sdk) `scripts/frontend/abi`.

## 3. Deploy pool and hook contracts

In [Our Uniswap V4 SDK](https://github.com/tofudfy/v4-sdk) repo:

1. Start a local blockchain node

   ```bash
   npx hardhat node
   ```

2. Deploy [Uniswap V4 core](https://github.com/Uniswap/v4-core) contracts

3. Configure blockchain networks, wallet, and contract addresses in:  
   `scripts/config.ts`

4. Run the hook deployment script:

   ```bash
   npx hardhat run scripts/depoly/depoly.ts
   ```

   - Limit Order Hook: `contracts/LimitOrder.sol`  
   - Dynamic Fee Hook: `contracts/DynamicFee.sol`

## 4. Initialize the PoolManager contract

Run the initialization script:

```bash
npx hardhat run scripts/frontend/init/init.ts
```

## 5. Contract interactions

### 5.1 Trading at Market Price 

- Add liquidity:

  ```bash
  npx hardhat run scripts/frontend/marketprice/addLiquidity.ts
  ```

- Swap:

  ```bash
  npx hardhat run scripts/frontend/marketprice/swap.ts
  ```

- Remove liquidity:

  ```bash
  npx hardhat run scripts/frontend/marketprice/removeLiquidity.ts
  ```

### 5.2 Trading of Limit Order

(*Requires `addLiquidity` operation first, otherwise order placement will fail*)  

- Place order:

  ```bash
  npx hardhat run scripts/frontend/limitorder/place.ts
  ```

- [Todo] Cancel order:

  ```bash
  npx hardhat run scripts/frontend/limitorder/kill.ts
  ```

- [Todo] Withdraw liquidity:

  ```bash
  npx hardhat run scripts/frontend/limitorder/withdraw.ts
  ```

### 5.3 Dynamic fee

- Adjust fee:

  ```bash
  npx hardhat test scripts/feehook/testfeehook.ts
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

# lq documents

## 部署
|   依赖   |  版本      |
|   ----   | ----       |
|    nvm   |  0.39.7    |
|   npm    | v20.19.5  |

运行命令：
```shell
npm install

npx hardhat node # 单独使用命令行执行

npx hardhat run scripts/deploy/deploy.ts
npx hardhat run scripts/deploy/inits.ts
```
## 测试
voucher测试通过

```shell
 npx hardhat test test/voucher.ts
```

