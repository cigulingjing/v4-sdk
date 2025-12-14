import { Contract } from "ethers";
// Check if the spender is approved to spend at least 'amount' tokens from ownerAddress
export async function isApproved(contract: Contract, ownerAddress: string, spenderAddress: string, amount: bigint) {
    let allowance = await contract.allowance(ownerAddress, spenderAddress);
    if (allowance >= amount) {
        return true;
    }
    else {
        return false;
    }
}

export async function approveERC20(contract: Contract, spenderAddress: string, amount: bigint) {
    let tx = await contract.approve(spenderAddress, amount);
    await tx.wait();
    console.log(`Approved ${amount} of token to ${spenderAddress}`);
}

export async function getAllowance(contract: Contract, ownerAddress: string, spenderAddress: string): Promise<bigint> {
    const allowance = await contract.allowance(ownerAddress, spenderAddress);
    console.log(`Allowance: ${allowance.toString()}`);
    return allowance;
}

export async function checkAndApproveERC20(contract: Contract, ownerAddress: string, spenderAddress: string, amount: bigint) {
    const allowance = await getAllowance(contract, ownerAddress, spenderAddress);

    if (allowance >= amount) {
        console.log(`Sufficient allowance already granted: ${allowance.toString()}`);
        return;
    }

    const tx = await contract.approve(spenderAddress, amount);
    const receipt = await tx.wait();
    console.log(`Transaction hash (approve): ${receipt.transactionHash}`);
}

export async function getERC20Balance(contract: Contract, address: string): Promise<bigint> {
    const balance: bigint = BigInt(await contract.balanceOf(address));
    // console.log(`ERC20 Balance: ${balance.toString()}`);
    return balance;
}

export async function transferERC20(contract: Contract, toAddress: string, amount: bigint) {
    const tx = await contract.transfer(toAddress, amount);
    const receipt = await tx.wait();
    console.log(`Transaction hash (transfer): ${receipt.transactionHash}`);
}


export async function mintERC20(contract: Contract, toAddress: string, amount: bigint) {
    const tx = await contract.mint(toAddress, amount);
    await tx.wait();
}
