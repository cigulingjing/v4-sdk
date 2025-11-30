import { Contract, Wallet } from "ethers";
import {ethers} from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, PRIVATE_KEY, RPC_URL } from "../config";
import { getERC20Balance } from "../lib/erc20";

async function withdrawLimitOrder(contract: Contract, epoch: number, to: string): Promise<{ owner: string; epoch: string; liquidity: string; }> {
    try {
        // Initiate the withdraw transaction
        const tx = await contract.withdraw(epoch, to);
        await tx.wait();

        // Return a promise that resolves when the "Kill" event is emitted
        return new Promise((resolve, reject) => {
            contract.once("Kill", (owner, eventEpoch, liquidity) => {
                resolve({
                    owner,
                    epoch: eventEpoch.toString(),
                    liquidity: liquidity.toString(),
                });
            });
        });

    } catch (error: any) {
        handleContractError(error);
        throw error;
    }
}

function handleContractError(error: any): void {
    if (error.code === 'CALL_EXCEPTION') {
        console.error('Transaction failed with CALL_EXCEPTION');
        switch (error.data) {
            case '0x10074548':
                console.error('Encountered custom error ZeroLiquidity()');
                break;
            case '0x6cb6fbf0':
                console.error('Encountered custom error NotFilled()');
                break;
            default:
                console.error('Unknown error data:', error.data);
        }
        console.log('Transaction Details:', error.transaction);
    } else {
        console.error('An unexpected error occurred:', error);
    }
}

async function withdrawLimitOrder_Old(contract: Contract, epoch: number, to: string): Promise<{ owner: string; epoch: string; liquidity: string; }> {
    const tx = await contract.withdraw(epoch, to);
    await tx.wait();

    return new Promise((resolve, reject) => {
        contract.once("Kill", (owner, eventEpoch, liquidity) => {
            resolve({
                owner,
                epoch: eventEpoch.toString(),
                liquidity: liquidity.toString()
            });
        });
    });
}

async function main(){
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = new Contract(CONTRACT_ADDRESSES.Token0, CONTRACTS['MockERC20Custom'].abi, wallet);
    const token1 = new Contract(CONTRACT_ADDRESSES.Token1, CONTRACTS['MockERC20Custom'].abi, wallet);

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before adding Limit order:", token0Before.toString());
    console.log("Token1 balance before adding limit order:", token1Before.toString());

    const hook = new Contract(CONTRACT_ADDRESSES.LimitOrder, CONTRACTS['LimitOrder'].abi, wallet);
    const epoch = 1
    const epo = await withdrawLimitOrder(hook, epoch, wallet.address);
    console.log("epoch:", epo);

    const token0After = await getERC20Balance(token0, wallet.address);
    const token1After = await getERC20Balance(token1, wallet.address);
    console.log("Token0 change:", token0After - token0Before);
    console.log("Token1 change:", token1After - token1Before);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
