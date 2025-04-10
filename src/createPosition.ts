import { ApiV3PoolInfoConcentratedItem, ClmmKeys, CobaltX, TxVersion, TickUtils, PoolUtils } from "@cobaltx/sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import { AccountLoader, getConnection, isValidClmm } from "./utils";
require("dotenv").config();

export async function initSdk(params: {
  owner: Keypair;
  conn: Connection;
  cluster: "mainnet" | "devnet";
  loadToken?: boolean;
}) {
  let cobaltx = await CobaltX.load({
    owner: params.owner,
    connection: params.conn,
    cluster: params.cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
  });

  return cobaltx;
}

async function main() {
  const al = new AccountLoader();
  const owner = al.getKeypairFromEnvironmentDecrypt();
  const conn = getConnection("mainnet");
  const txVersion = TxVersion.LEGACY;
  const cobaltx = await initSdk({
    owner,
    conn,
    cluster: "mainnet",
    loadToken: true,
  });

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  const poolId = "HXVLdBv2FMNLUw74rbfcLhV8eYTJbzufN9v8ep97FEsu";
  let poolKeys: ClmmKeys | undefined;

  const data = await cobaltx.api.fetchPoolById({ ids: poolId });
  poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;
  if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool');

  const inputAmount = 0.0001;
  const [startPrice, endPrice] = [0.000001, 100000];

  const { tick: lowerTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(startPrice),
    baseIn: true,
  });

  const { tick: upperTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(endPrice),
    baseIn: true,
  });

  const epochInfo = await cobaltx.fetchEpochInfo();
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
    poolInfo,
    slippage: 0,
    inputA: true,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    amount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    add: true,
    amountHasFee: true,
    epochInfo: epochInfo,
  });

  const { execute, extInfo } = await cobaltx.clmm.openPositionFromBase({
    poolInfo,
    poolKeys,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    base: 'MintA',
    ownerInfo: {
      useSOLBalance: true,
    },
    baseAmount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    otherAmountMax: res.amountSlippageB.amount,
    txVersion,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 100000,
    },
    nft2022: true,
  });

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true });
  console.log('clmm position opened:', { txId, nft: extInfo.nftMint.toBase58() });
}

if (require.main === module) {
  main();
} 