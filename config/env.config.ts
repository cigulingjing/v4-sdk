// import * as dotenv from "dotenv";
import { ethers } from "ethers";

// const env = dotenv.config({ path: path.resolve(__dirname, "../.env") }).parsed || {};

/**
 * 环境变量配置接口定义
 */
export interface EnvConfig {
    // RPC 和钱包配置
    rpc: {
        url: string;
    };
    wallet: {
        privateKey: string;
        address: string;
    };

    // 合约地址配置
    contracts: {
        mutiVoucher:string;
        auction: {
            chainYVaultV2: string;
            chainXAuctionV2: string;
            coinbase: string;
        };
        uniswap: {
            create2: string;
            token0: string;
            token1: string;
            poolManager: string;
            liquidPool: string;
            limitOrder: string;
            dynamicFee: string;
        };
    };
    // ABI 文件路径配置 (完整路径)
    abiPaths: {
        mutiVoucher:string;
        auction: {
            chainYVault: string;
            chainXAuction: string;
            coinbase:string;
        };
        uniswap: {
            poolManager: string;
            mockERC20: string;
            liquidPool: string;
            limitOrder: string;
            dynamicFee: string;
            create2: string;
            example: string;
        };
    };
    // Pool 配置
    pool: {
        salt: string;
        saltLimitOrder: string;
        priceInit: number;
        priceLimit: number;
        initialLiquidity: bigint;
        initialSupply: bigint;
        dynamicFeeFlag: number;
    };
    // 路径配置
    paths: {
        abiRootDir: string;  // ABI 文件根目录
    };
}

/**
 * 从环境变量中获取值,如果不存在则使用默认值
 */
function getEnvValue(key: string, defaultValue: string): string {
    const value = process.env[key];
    if (value === undefined || value === "") {
        console.warn(`Environment variable ${key} is not set, using default value: ${defaultValue}`);
        return defaultValue;
    }
    return value;
}

/**
 * 从环境变量中获取数字值
 */
function getEnvNumber(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (value === undefined || value === "") {
        return defaultValue;
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
        console.warn(`Warning: ${key} is not a valid number, using default value ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}

/**
 * 从环境变量中获取 BigInt 值
 */
function getEnvBigInt(key: string, defaultValue: string): bigint {
    const value = getEnvValue(key, defaultValue);
    try {
        return ethers.utils.parseEther(value).toBigInt();
    } catch (error) {
        console.warn(`Warning: ${key} is not a valid ether value, using default value ${defaultValue}`);
        return ethers.utils.parseEther(defaultValue).toBigInt();
    }
}

/**
 * 拼接 ABI 文件路径
 * @param rootDir ABI 根目录
 * @param relativePath 相对路径
 * @returns 完整路径
 */
function joinAbiPath(rootDir: string, relativePath: string): string {
    // 移除路径中的多余斜杠
    const cleanRoot = rootDir.replace(/\/+$/, "");
    const cleanRelative = relativePath.replace(/^\/+/, "");
    return `${cleanRoot}/${cleanRelative}`;
}

/**
 * 加载并解析环境变量配置
 */
function loadConfig(): EnvConfig {
    // 获取 ABI 根目录
    const abiRootDir = getEnvValue("ABI_ROOT_DIR", "chain-core/ABI");

    return {
        rpc: {
            url: getEnvValue("RPC_URL", "http://127.0.0.1:8545/"),
        },
        wallet: {
            privateKey: getEnvValue(
                "PRIVATE_KEY",
                "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
            ),
            address: getEnvValue(
                "ACCOUNT_ADDR",
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
            ),
        },
        contracts: {
            mutiVoucher:getEnvValue("MutiVoucher","0x0000000000000000000000000000000000000044"),
            auction: {
                chainYVaultV2: getEnvValue("ChainYVaultV2", "0xAa9e62EB6d74d66Ff6720D1A8143c8237067Ff58"),
                chainXAuctionV2: getEnvValue("ChainXAuctionV2", "0x88566F811b751Fa527A0816d99d6968E00f2eBef"),
                coinbase: getEnvValue("Coinbase", "0xAa9e62EB6d74d66Ff6720D1A8143c8237067Ff58"),
            },
            uniswap: {
                create2: getEnvValue("Create2", "0xCD8a1C3ba11CF5ECfa6267617243239504a98d90"),
                token0: getEnvValue("Token0", "0x62B771ec87108E06E32291e81D4a9ec6b75B9393"),
                token1: getEnvValue("Token1", "0xD0Fe15DCd319b834AB34e17AE3a82e9Ec0756fD1"),
                poolManager: getEnvValue("PoolManager", "0xf1a3B2d7c11889Ec3146392ABaDD4fac3EEbd831"),
                liquidPool: getEnvValue("LiquidPool", "0x46eDC5824c1a323aBd886842A59B7B3BbAaC2d83"),
                limitOrder: getEnvValue("LimitOrder", "0x9c525D6B8f2E90653DC034c8506AB7ad8FfC9040"),
                dynamicFee: getEnvValue("DynamicFee", "0xba80244ffA7ae0662f70464043514daED0E71040"),
            },
        },
        abiPaths: {
            mutiVoucher: getEnvValue("MutiVoucher_abi_path", "MutiVoucher.json"),
            auction: {
                chainYVault: getEnvValue("ChainYVault_abi_path", "ChainYVaultV2.json"),
                chainXAuction: getEnvValue("ChainXAuction_abi_path", "ChainXAuctionV2.json"),
                coinbase: getEnvValue("Coinbase_abi_path", "Coinbase.json"),
            },
            uniswap: {
                poolManager: getEnvValue("PoolManager_abi_path", "PoolManager.json"),
                mockERC20: getEnvValue("MockERC20_abi_path", "MockERC20.json"),
                liquidPool: getEnvValue("LiquidPool_abi_path", "LiquidPool.json"),
                limitOrder: getEnvValue("LimitOrder_abi_path", "LimitOrder.json"),
                dynamicFee: getEnvValue("DynamicFee_abi_path", "DynamicFee.json"),
                create2: getEnvValue("Create2_abi_path", "Create2.json"),
                example: getEnvValue("Example_abi_path", "Example.json"),
            },
        },
        pool: {
            salt: getEnvValue("SALT", ethers.utils.keccak256("0x00")),
            saltLimitOrder: getEnvValue("SALT_LIMITORDER", ethers.utils.keccak256("0x01")),
            priceInit: getEnvNumber("PRICE_INIT", 1),
            priceLimit: getEnvNumber("PRICE_LIMIT", 1.1),
            initialLiquidity: getEnvBigInt("INITIAL_LIQUIDITY", "1000"),
            initialSupply: getEnvBigInt("INITIAL_SUPPLY", "210000000"),
            dynamicFeeFlag: 0x800000,
        },
        paths: {
            abiRootDir,
        },
        
    };
}

/**
 * 导出配置对象
 */
export const config: EnvConfig = loadConfig();
export const RPC_URL = config.rpc.url;
export const PRIVATE_KEY = config.wallet.privateKey;
export const ACCOUNT_ADDR = config.wallet.address;

