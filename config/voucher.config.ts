import { config } from "./env.config";
import MutiVoucherABI from "../artifacts/contracts/MutiVoucher.sol/MutiVoucher.json";

export const MUTI_VOUCHER_ADDR=config.contracts.mutiVoucher
export const MUTI_VOUCHER_ABI = MutiVoucherABI;