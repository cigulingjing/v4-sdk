const { ethers } = require("hardhat");

async function main() {
  const provider = ethers.provider;

  // 从命令行获取地址
  const address = process.argv[2];

  if (!address) {
    console.error("❌ 请传入地址，例如：");
    console.error("npx hardhat run script.js --network <network> 0xYourAddress");
    process.exit(1);
  }

  // 校验地址
  if (!ethers.isAddress(address)) {
    console.error("❌ 地址格式不合法");
    process.exit(1);
  }

  try {
    const balance = await provider.getBalance(address);

    console.log("Address:", address);
    console.log("Balance (wei):", balance.toString());
    console.log("Balance (ETH):", ethers.formatEther(balance));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ 查询失败:", message);
  }
}

main();