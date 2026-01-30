import { config } from "./env.config";
import { join } from "path";
// MutiVoucher 相关
function relativePath(filepath:string):string{
    const ROOT = '..';
    return join(ROOT,filepath)
}

export const MUTI_VOUCHER_ADDR=config.contracts.mutiVoucher
export const MUTI_VOUCHER_ABI = require(relativePath(config.abiPaths.mutiVoucher));