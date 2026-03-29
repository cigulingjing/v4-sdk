import type { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers" // ethers v5, conflict with  
import "@nomicfoundation/hardhat-chai-matchers"; // Test chai matchers
import * as dotenv from "dotenv";

// 加载环境变量
dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    punk: {
      url: process.env.PUNK_RPC_URL || "http://127.0.0.1:8666/",
      accounts: process.env.PUNK_PRIVATE_KEY ? [process.env.PUNK_PRIVATE_KEY] : [],
      chainId: process.env.PUNK_CHAIN_ID ? parseInt(process.env.PUNK_CHAIN_ID) : 11223344,
      blockGasLimit: 8000000,
    }
  },
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;
