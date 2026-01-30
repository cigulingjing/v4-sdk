import { Contract, Wallet } from "ethers";
import { ethers } from "hardhat";
import { CONTRACT_ADDRESSES, CONTRACTS, PRIVATE_KEY, RPC_URL } from "../../../config/uniswap.config";
import { getERC20Balance } from "../lib/ERC20";
import { getContract } from "../lib/wallet";

async function withdrawLimitOrder(contract: Contract, epoch: number, to: string): Promise<{ owner: string; epoch: string; liquidity: string; }> {
    try {
        // Initiate the withdraw transaction
        const tx = await contract.withdraw(epoch, to);
        await tx.wait();
        console.log("Withdraw executed successfully.");

        // Return a promise that resolves when the "Kill" event is emitted
        // 监听链上事件，如果事件成功则返回结果。
        return new Promise((resolve, reject) => {
            contract.once("Withdraw", (owner, eventEpoch, liquidity) => {
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


async function main() {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const wallet = new Wallet(PRIVATE_KEY, provider);

    const token0 = await getContract(wallet, "Token0");
    const token1 = await getContract(wallet, "Token1");
    const LimitOrder = await getContract(wallet, "LimitOrder");

    const token0Before = await getERC20Balance(token0, wallet.address);
    const token1Before = await getERC20Balance(token1, wallet.address);
    console.log("Token0 balance before adding Limit order:", token0Before.toString());
    console.log("Token1 balance before adding limit order:", token1Before.toString());


    const epoch = 1;
    const epo = await withdrawLimitOrder(LimitOrder, epoch, wallet.address);
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
