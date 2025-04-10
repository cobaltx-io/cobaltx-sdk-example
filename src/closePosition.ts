import { ApiV3PoolInfoConcentratedItem, ClmmKeys, CobaltX, TxVersion } from "@cobaltx/sdk-v2";
import { Connection, Keypair } from "@solana/web3.js";
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

  const data = await cobaltx.api.fetchPoolById({ ids: poolId });
  poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;
  if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool');

  const allPosition = await cobaltx.clmm.getOwnerPositionInfo({ programId: poolInfo.programId });
  if (!allPosition.length) throw new Error('user do not have any positions');

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id);
  if (!position) throw new Error(`user do not have position in pool: ${poolInfo.id}`);

  const { execute } = await cobaltx.clmm.closePosition({
    poolInfo,
    ownerPosition: position,
    txVersion,
  });

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true });
  console.log('clmm position closed:', { txId: `https://explorer.soo.network/tx/${txId}` });
}

if (require.main === module) {
  main();
} 