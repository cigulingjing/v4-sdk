const hre = require("hardhat");
const { ethers } = hre;
const { getAuctionID } = require("../test/utils/serialize");

// Environment variables
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // caller private key
const VAULT_ADDR = process.env.VAULT_ADDR; // deployed ChainYVaultV2 address

function getProvider() {
  return new ethers.providers.JsonRpcProvider(RPC_URL);
}

function getSigner() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY missing");
  return new ethers.Wallet(PRIVATE_KEY, getProvider());
}

async function getVaultContract(signer) {
  const abi = (await hre.artifacts.readArtifact("ChainYVaultV2")).abi;
  console.log("VAULT_ADDR:", VAULT_ADDR);
  return new ethers.Contract(VAULT_ADDR, abi, signer);
}

// Helpers
function toWei(valueEth) {
  return ethers.utils.parseEther(valueEth.toString());
}

// Build an unlock receipt RLP with the MatchResultWithdrawn log
function buildUnlockReceipt({ logAddress, auctionId, lockId, recipient, amount }) {
  const status = "0x01";
  const cumulativeGasUsed = "0x00";
  const logsBloom = "0x" + "00".repeat(256);

  const topic0 = ethers.utils.id("MatchResultWithdrawn(uint256,bytes32,address,uint256)");
  const eventData = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "bytes32", "address", "uint256"],
    [auctionId, lockId, recipient, amount]
  );

  const log = [
    logAddress,
    [topic0],
    ethers.utils.arrayify(eventData),
  ];

  const logBlob = ethers.utils.RLP.encode(log);
  return ethers.utils.RLP.encode([status, cumulativeGasUsed, logsBloom, logBlob]);
}

// API
async function createAuctionConfig({ auctionType, baseAmountEth, extendSeconds }) {
  const signer = getSigner();
  const vault = await getVaultContract(signer);
  const tx = await vault.createAuctionConfig(auctionType, toWei(baseAmountEth), extendSeconds);
  await tx.wait();
  return tx.hash;
}

async function setUnlockStrategy({ auctionType, strategyAddress }) {
  const signer = getSigner();
  const vault = await getVaultContract(signer);
  const tx = await vault.setUnlockStrategy(auctionType, strategyAddress);
  await tx.wait();
  return tx.hash;
}

async function createAuction({ configId, secretText, expirationTs, amountEth }) {
  const signer = getSigner();
  const vault = await getVaultContract(signer);
  const hashSecret = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(secretText));
  const tx = await vault.createAuction(configId, hashSecret, expirationTs, {
    value: toWei(amountEth),
  });
  const receipt = await tx.wait();
  const evt = receipt.events.find((e) => e.event === "TokensLocked");
  return {
    txHash: tx.hash,
    auctionId: evt?.args?.auctionId,
    lockId: evt?.args?.lockId,
  };
}

async function unlockTokens({ lockId, rawReceipt }) {
  const signer = getSigner();
  const vault = await getVaultContract(signer);
  const tx = await vault.unlockTokens(lockId, rawReceipt);
  const receipt = await tx.wait();
  const evt = receipt.events.find((e) => e.event === "TokensUnlocked");
  return {
    txHash: tx.hash,
    recipient: evt?.args?.recipient,
    amount: evt?.args?.amount,
  };
}

// Example flow for local testing
async function demo() {
  const signer = getSigner();
  const seller = signer.address;
  const auctionType = 0x00000001;
  const baseAmount = "1.0";
  const extendSeconds = 86400;

  await createAuctionConfig({ auctionType, baseAmountEth: baseAmount, extendSeconds });
  // optional: set strategy if needed
  // await setUnlockStrategy({ auctionType, strategyAddress: "0x..." });

  const expiration = Math.floor(Date.now() / 1000) + 3600;
  const { lockId, auctionId } = await createAuction({
    configId: 0,
    secretText: "secret",
    expirationTs: expiration,
    amountEth: baseAmount,
  });

  console.log("lockId", lockId, "auctionId", auctionId?.toString());
}

if (require.main === module) {
  demo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  createAuctionConfig,
  setUnlockStrategy,
  createAuction,
  unlockTokens,
  buildUnlockReceipt,
};
