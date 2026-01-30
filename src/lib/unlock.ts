import { ethers } from "ethers";
import fs from "fs";

const keystore = fs.readFileSync("keystore.json", "utf-8");
const password = "mypassword";

async function loadWallet() {
  const wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
  console.log("Private Key:", wallet.privateKey);
  console.log("Public Key:", wallet.publicKey);
  console.log("Address:", wallet.address);
}

loadWallet();
