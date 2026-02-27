
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

### debug记录

签名不合法
- 原因：ether.getSigner()函数返回当前链所有对象，但是私有链只有一个账户，所以测试时候addr2为空。
- 解决：在hardhat测试mutiple users即可。
``` bash
      1) Should return correct balance for multiple users

    Error: sending a transaction requires a signer (operation="sendTransaction", code=UNSUPPORTED_OPERATION, version=contracts/5.7.0)
```