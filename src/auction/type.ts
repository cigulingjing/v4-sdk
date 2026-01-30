import { MatchResultWithdrawnEvent } from "./event";

// * chainXAuction 相关参数
export interface CreateAuctionParams {
  seller: string;
  sourceChainId: number;
  activeAuctionCount: bigint;
  auctionType: number;
}

export interface PlaceBidParams {
  auctionId: string;
  seller: string;
  valueEth: string;
  secretText?: string;
}

export interface RevealBidParams {
  auctionId: string;
  valueEth: string;
  saltHex?: string;
}

export interface RevealLockParams {
  auctionId: string;
  lockId: string;
  valueEth: string;
  saltHex?: string;
}

export interface SubmitMatchResultsParams {
  auctionId: string;
  lockIds: string[];
  bidders: string[];
  finalValuesEth: string[];
}

export interface ChallengeMatchResultParams {
  auctionId: string;
  bidder: string;
}

export interface WithdrawMatchResultParams {
  auctionId: string;
  lockId: string;
}

// * chainYVaultClient 相关参数

export interface CreateAuctionConfigParams {
  auctionType: number;
  baseAmountEth: string;
  extendSeconds: number;
}

export interface SetUnlockStrategyParams {
  auctionType: number;
  strategyAddress: string;
}

export interface CreateAuctionParams {
  configId: number;
  secretText: string;
  expirationTs: number;
  amountEth: string;
}

export interface UnlockTokensParams {
  lockId: string;
  rawReceipt: string;
}
