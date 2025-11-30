import type { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-ethers" // ethers v5, conflict with  
import "@nomicfoundation/hardhat-chai-matchers"; // Test chai matchers

const config: HardhatUserConfig = {
  defaultNetwork: "localhost",
  networks: {
    hardhat: {
      gas: 210000, 
      blockGasLimit: 80000000, 
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 30000000, 
      blockGasLimit: 80000000, 
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
