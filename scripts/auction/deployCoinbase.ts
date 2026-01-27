import{ ethers } from "hardhat";
import { RPC_URL, PRIVATE_KEY} from "../../config/auction.config";
import { Wallet } from "ethers";

export async function deployCoinbase(wallet:Wallet): Promise<string> {
  const CoinBaseFactory=await ethers.getContractFactory("Coinbase", wallet);
  const coinbase=await CoinBaseFactory.deploy();
  await coinbase.deployed();
  return coinbase.address;
}

async function main(){
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const coinbaseAddr = await deployCoinbase(wallet);
  console.log(`Coinbase deployed at: ${coinbaseAddr} by ${wallet.address}`);
};

if (require.main === module) {
    main();
}