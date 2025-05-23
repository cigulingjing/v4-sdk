import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers"; // ethers v6
// import "@nomicfoundation/hardhat-toolbox-viem";
// import "@nomiclabs/hardhat-ethers" // ethers v5, conflict with hardhat-ignition-ethers 

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 35000000, // Custom gas limit for transactions
      blockGasLimit: 35000000, // Extended block gas limit
    },
    // other networks...
  },
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  ignition: {
    strategyConfig: {
      create2: {
        // To learn more about salts, see the CreateX documentation
        salt: "0x7ecbff2d0dcb14ff23216d266df63cd028d09c59d10e9ceb269ca67bdfff5e0b",
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};

export default config;
