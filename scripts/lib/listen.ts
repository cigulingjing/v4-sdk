import { Contract } from "ethers";

export async function listenAllEvents(hook: Contract): Promise<void> {
    hook.on('*', (event) => {
        console.log(`${event.event} event emitted:`);
        for (const key in event.args) {
            if (event.args.hasOwnProperty(key)) {
                console.log(`${key}: ${event.args[key].toString()}`);
            }
        }
    });
}

export async function listenPlaceEvent(contract: Contract): Promise<void> {
    contract.once("Place", (owner, epoch, key, tickLower, zeroForOne, liquidity) => {
        console.log("Place event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Key: ", key);
        console.log("TickLower: ", tickLower.toString());
        console.log("ZeroForOne: ", zeroForOne);
        console.log("Liquidity: ", liquidity.toString());
    });
}

export async function listenKillEvent(contract: Contract): Promise<void> {
    contract.once("Kill", (owner, epoch, key, tickLower, zeroForOne, liquidity) => {
        console.log("Kill event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Key: ", key);
        console.log("TickLower: ", tickLower.toString());
        console.log("ZeroForOne: ", zeroForOne);
        console.log("Liquidity: ", liquidity.toString());
    });
}

export async function listenWithdrawEvent(contract: Contract): Promise<void> {
    contract.once("Withdraw", (owner, epoch, liquidity) => {
        console.log("Withdraw event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Liquidity: ", liquidity.toString());
    });
}

export async function listenFillEvent(contract: Contract): Promise<void> {
    contract.once("Fill", (owner, epoch, key, tickLower, zeroForOne, liquidity) => {
        console.log("Fill event emitted:");
        console.log("Owner: ", owner);
        console.log("Epoch: ", epoch.toString());
        console.log("Key: ", key);
        console.log("TickLower: ", tickLower.toString());
        console.log("ZeroForOne: ", zeroForOne);
        console.log("Liquidity: ", liquidity.toString());
    });
}
