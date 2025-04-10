import { CobaltX, SOL_INFO, TxVersion, computeSwap } from "@cobaltx/sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import { AccountLoader, getConnection, sendTxn } from "./utils";
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

async function swap({
  cobaltx,
  poolId,
  inputMint,
  inputAmount,
  txVersion,
  slippage,
  swapType,
  owner,
  conn,
}: {
  cobaltx: CobaltX;
  poolId: string;
  inputMint: string;
  inputAmount: BN;
  txVersion: TxVersion;
  slippage: number;
  swapType: SwapType;
  owner: Keypair;
  conn: Connection;
}) {
  const data = await cobaltx.clmm.getPoolInfoFromRpc(poolId);
  const poolInfo = data.poolInfo;

  if (
    inputMint !== poolInfo.mintA.address &&
    inputMint !== poolInfo.mintB.address
  )
    throw new Error("input mint does not match pool");

  const baseIn = inputMint === poolInfo.mintA.address;

  const computeSwapResponse = await computeSwap({
    inputMint: inputMint,
    outputMint: poolInfo[baseIn ? "mintB" : "mintA"].address,
    amount: inputAmount.toString(),
    slippage,
    swapType,
    txVersion,
  });

  const { success, unsignedVersionedTxs } = await cobaltx.tradeV2.swapTokenAct({
    swapResponse: computeSwapResponse,
    txVersion: txVersion,
    microLamports: new Decimal("0" as string)
      .mul(10 ** SOL_INFO.decimals)
      .toDecimalPlaces(0)
      .toNumber(),
    publicKey: owner.publicKey,
    unwrapSol: false,
    inputTokenAddress: inputMint,
    inputTokenProgramId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    outputTokenAddress: poolInfo[baseIn ? "mintB" : "mintA"].address,
    outputTokenProgramId: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  });

  unsignedVersionedTxs.map((tx) => tx.sign([owner]));

  await sendTxn(
    Promise.all(unsignedVersionedTxs.map((tx) => conn.sendTransaction(tx))),
    `swap in clmm pool`
  );
}

export type SwapType = "BaseIn" | "BaseOut";

async function main() {
  const al = new AccountLoader();
  const owner = al.getKeypairFromEnvironmentDecrypt();
  const conn = getConnection("mainnet");
  const txVersion = TxVersion.LEGACY; // or TxVersion.LEGACY
  const cobaltx = await initSdk({
    owner,
    conn,
    cluster: "mainnet",
    loadToken: true,
  });

  const poolId = "646x4X8ENfqjeVHPkhkiqSaB4qqZBYnKrVC9hqZJCZBp";
  const inputMint = "So11111111111111111111111111111111111111112";
  const inputAmount = new BN(100);
  const slippage = 0.01;
  const swapType: SwapType = "BaseIn";

  await swap({
    cobaltx,
    poolId,
    inputMint,
    inputAmount,
    txVersion,
    slippage,
    swapType,
    owner,
    conn,
  });
}

if (require.main === module) {
  main();
}
