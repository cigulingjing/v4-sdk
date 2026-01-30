
// * ChainXAuction 相关事件

export interface MatchResultWithdrawnEvent{
    auctionId: bigint;
    lockId: string;
    recipient: string;
    amount: bigint;
}


// * ChainYVault 相关事件
// event AuctionCreated(uint256 indexed auctionId, uint32 auctionType, uint256 activeAuctionCount, uint256 revealTime
export interface auctionCreatedEvent {
    auctionId: string; // 使用string存储，auctionId是Keccak256计算的hash值，在调用合约时候会自动转化为uiny256
    auctionType: number;
    activeAuctionCount: bigint;
    revealTime: bigint;
}
