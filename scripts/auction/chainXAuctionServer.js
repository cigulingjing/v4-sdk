const hre = require("hardhat");
const { ethers } = hre;
const { getAuctionID, buildXReceipt , buildSignedTx} = require("../test/utils/serialize"); // 路径按需调整
const { env } = require("node:process");

// 环境配置
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // 调用者私钥
const CHAINX_AUCTION_ADDR = process.env.AUCTION_ADDR; // 部署好的 ChainXAuctionV2 地址
const VAULT_ADDR = process.env.VAULT_ADDR;

function addressFromPrivateKey(pk) {
  // pk 需带 0x 前缀
  const wallet = new ethers.Wallet(pk);
  return wallet.address;
}

async function getSigner() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY not set in env");
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

async function getContract(signer) {
  if (!CHAINX_AUCTION_ADDR) throw new Error("AUCTION_ADDR not set in env");
  const abi = (await hre.artifacts.readArtifact("ChainXAuctionV2")).abi;
  return new ethers.Contract(CHAINX_AUCTION_ADDR, abi, signer);
}

// 1) 创建拍卖（跨链消息）
async function createAuction({ seller, sourceChainId, activeAuctionCount, auctionType }) {
  const signer = await getSigner();
  // ensure activeAuctionCount aligns with sender nonce used in rawTx/signature
  const providerNonce = await signer.provider.getTransactionCount(seller);
  const chainId = sourceChainId || (await signer.provider.getNetwork()).chainId;
  const useNonce = activeAuctionCount ?? providerNonce;
  const auctionId = getAuctionID(seller, chainId, VAULT_ADDR, useNonce);

  // 构造链Y的合约
  const { rawTx } = await buildSignedTx({
    privateKey: PRIVATE_KEY,
    to: VAULT_ADDR,
    value: 0,
    gasPrice: ethers.utils.parseUnits("1", "gwei"),
    gasLimit: 52_200,
    nonce: useNonce,
    chainId,
  });
  const logAddress =
    "0x307833383843383138434138423932353162333933313331433038613733364136376363423139323937";
  const revealStartTime = Math.floor(Date.now() / 1000) + 60; // 1 分钟后开始

  const rawRecpt = buildXReceipt({
    auctionId,
    auctionType,
    activeAuctionCount: useNonce,
    revealTime: revealStartTime,
    logAddress,
  });

  const crossChainMessage = ethers.utils.defaultAbiCoder.encode(
    ["tuple(uint256 sourceChainId, bytes rawTransaction, bytes rawRecpt)"],
    [[chainId, rawTx, rawRecpt]]
  );

  const contract = await getContract(signer);
  const tx = await contract.createAuction(crossChainMessage);
  await tx.wait();
  console.log("Auction created, auctionId:", auctionId);
  return { auctionId, revealStartTime };
}

// 2) 出价（公开竞价示例）
async function placeBid({ auctionId, seller, valueEth, secretText = "secret" }) {
  const signer = await getSigner();
  const contract = await getContract(signer);

  const value = ethers.utils.parseEther(valueEth);
  const bidValue = ethers.utils.hexZeroPad(value.toHexString(), 32);
  const secretHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secretText));
  const depositAmount = value.mul(15).div(10); // 1.5x 保证金示例

  const tx = await contract.placeBid(auctionId, seller, secretHash, bidValue, {
    value: depositAmount,
  });
  await tx.wait();
  console.log("Bid placed");
  return { bidValue, secretHash };
}

// 3) 揭示（公开竞价）
async function revealBid({ auctionId, valueEth, saltHex }) {
  const signer = await getSigner();
  const contract = await getContract(signer);
  const value = ethers.utils.parseEther(valueEth);
  const salt = saltHex || ethers.utils.randomBytes(32); // 公开竞价无需 salt 校验，保持一致即可
  const tx = await contract.revealBid(auctionId, value, salt);
  await tx.wait();
  console.log("Bid revealed");
}

// 4) 提交匹配结果
async function submitMatchResults({ auctionId, lockIds, bidders, finalValuesEth }) {
  const signer = await getSigner();
  const contract = await getContract(signer);
  const finalValues = finalValuesEth.map((v) => ethers.utils.parseEther(v));
  const tx = await contract.submitMatchResults(auctionId, lockIds, bidders, finalValues);
  await tx.wait();
  console.log("Match results submitted");
}

// 5) 挑战匹配结果
async function challengeMatchResult({ auctionId, bidder }) {
  const signer = await getSigner();
  const contract = await getContract(signer);
  const tx = await contract.challengeMatchResult(auctionId, bidder);
  await tx.wait();
  console.log("Match result challenged");
}

// 6) 提现（挑战期结束后）
async function withdrawMatchResult({ auctionId, lockId }) {
  const signer = await getSigner();
  const contract = await getContract(signer);
  const tx = await contract.withdrawMatchResult(auctionId, lockId);
  await tx.wait();
  console.log("Withdraw done");
}

// 示例串联调用（本地网络）
(async () => {
  const seller = addressFromPrivateKey(PRIVATE_KEY);
  const sourceChainId = 31337;
  const activeAuctionCount = 0;
  const auctionType = 0x00000001;
  const { auctionId } = await createAuction({ seller, sourceChainId, activeAuctionCount, auctionType });
  await placeBid({ auctionId, seller, valueEth: "1.0" });
  // 时间旅行略，可用 evm_increaseTime 或等待
  // await revealBid({ auctionId, valueEth: "1.0" });
  // submitMatchResults/challenge/withdraw 视需要调用
})();

module.exports = {
  createAuction,
  placeBid,
  revealBid,
  submitMatchResults,
  challengeMatchResult,
  withdrawMatchResult,
};