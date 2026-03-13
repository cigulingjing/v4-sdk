import { Wallet, Contract, BigNumber } from "ethers";
import { getContract } from "../lib/contract";

export interface UserPosition {
    tokenId: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string; // use string because BigNumber representation is safer for frontend 
}

/**
 * Fetch all liquidity positions for a specific user from the LiquidPool contract.
 * @param wallet The user's wallet or signer instance.
 * @param userAddress Addres of the user to fetch positions for. If not provided, it uses the wallet's address.
 * @returns An array of UserPosition objects containing the position details.
 */
export async function getUserPositions(wallet: Wallet, userAddress?: string): Promise<UserPosition[]> {
    const liqPool = await getContract(wallet, "LiquidPool");
    
    // Determine the target address (either passed in or extracted from the wallet)
    const targetAddress = userAddress || await wallet.getAddress();
    
    console.log(`[SDK] Fetching liquidity NFT positions for address: ${targetAddress}`);

    try {
        // Assume getPosition is the method we added to LiquidPool.sol
        // returning struct PositionInfo { uint256 tokenId; int24 tickLower; int24 tickUpper; int256 liquidity; }
        const positions: any[] = await liqPool.getPosition(targetAddress);
        
        const formattedPositions: UserPosition[] = positions.map(pos => {
            return {
                tokenId: pos.tokenId.toNumber(),
                // tick is int24, so it should fit standard JS number
                tickLower: pos.tickLower,
                tickUpper: pos.tickUpper,
                // liquidity is int256, keep as string to prevent JS precision loss
                liquidity: pos.liquidity.toString()
            };
        });

        console.log(`[SDK] Found ${formattedPositions.length} position(s).`);
        return formattedPositions;

    } catch (error) {
        console.error(`[SDK] Failed to fetch user positions: `, error);
        throw error;
    }
}
