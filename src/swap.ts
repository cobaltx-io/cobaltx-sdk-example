import { API_URLS, CobaltX, TxVersion, getApiUrl } from "@cobaltx/sdk-v2";
import { Connection, Keypair, PublicKey, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import BN from "bn.js";
import Decimal from "decimal.js";
import { AccountLoader, getConnection, sendTxn } from "./utils";
import { NetworkName } from "@cobaltx/sdk-v2/lib/config";
import axios from "axios";
import base58 from "bs58";
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
    network: NetworkName.sooneth,
  });

  return cobaltx;
}

async function swap({
  cobaltx,
  inputMint,
  inputAmount,
  outputMint,
  txVersion,
  slippage,
  owner,
  conn,
}: {
  cobaltx: CobaltX;
  inputMint: string;
  outputMint: string;
  inputAmount: BN;
  txVersion: TxVersion;
  slippage: number;
  owner: Keypair;
  conn: Connection;
}) {
  const swapComputeUrl =
    inputMint && outputMint && !new Decimal(inputAmount.toString() || 0).isZero()
      ? `${getApiUrl(NetworkName.sooneth).SWAP_HOST}${
          API_URLS.SWAP_COMPUTE
        }swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmount.toString()}&slippageBps=${slippage}&txVersion=${
          txVersion === TxVersion.V0 ? "V0" : "LEGACY"
        }`
      : null;

  if (!swapComputeUrl) {
    throw new Error("Swap compute url generation failed");
  }

  const computeSwapResponse = await axios.get(swapComputeUrl).then((res) => res.data).catch((err) => {
    console.error(err)
    throw new Error("Swap compute failed");
  })

  const inputToken = await cobaltx.token.getTokenInfo(new PublicKey(inputMint))
  const outputToken = await cobaltx.token.getTokenInfo(new PublicKey(outputMint))

  const inputTokenAcc = await cobaltx.account.getCreatedTokenAccount({
    programId: new PublicKey(inputToken.programId ?? "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5D"),
    mint: new PublicKey(inputToken.address),
    associatedOnly: false
  })

  const outputTokenAcc = await cobaltx.account.getCreatedTokenAccount({
    programId: new PublicKey(outputToken.programId ?? "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5D"),
    mint: new PublicKey(outputToken.address)
  })

  const buildTxResponse = await axios.post(
    `${getApiUrl(NetworkName.sooneth).SWAP_HOST}${API_URLS.SWAP_TX}swap-base-in`,
    {
      wallet: owner.publicKey.toBase58(),
      computeUnitPriceMicroLamports: Number((computeSwapResponse.data?.microLamports || 0).toFixed(0)),
      swapResponse: computeSwapResponse.data,
      txVersion: txVersion === TxVersion.V0 ? 'V0' : 'LEGACY',
      wrapSol: true,
      unwrapSol: false,
      inputAccount: inputTokenAcc,
      outputAccount: outputTokenAcc
    }
  ).then((res) => res.data).catch((err) => {
    console.error(err)
    throw new Error("Swap transaction generation failed");
  })
  const swapTransactions = buildTxResponse.data || []
  const allTxBuf = swapTransactions.map((tx: any) => base58.decode(tx.transaction))
  const allTx = allTxBuf.map((txBuf: any) => new VersionedTransaction(VersionedMessage.deserialize(Uint8Array.from(txBuf))))

  const signedTransactions = allTx.map((tx: VersionedTransaction) => {
    tx.sign([owner]);
    return tx;
  });

  await sendTxn(
    Promise.all(signedTransactions.map((tx: VersionedTransaction) => conn.sendTransaction(tx))),
    `Swap from ${inputMint} to ${outputMint}`
  );
}

export type SwapType = "BaseIn" | "BaseOut";

async function main() {
  const al = new AccountLoader();
  const owner = al.getKeypairFromEnvironmentDecrypt();
  const conn = await getConnection(NetworkName.sooneth);
  const txVersion = TxVersion.LEGACY; // or TxVersion.LEGACY
  const cobaltx = await initSdk({
    owner,
    conn,
    cluster: "mainnet",
    loadToken: true,
  });

  const inputMint = "So11111111111111111111111111111111111111112";
  const inputAmount = new BN(10000000);
  const outputMint = "ERFzpDteGNo8LTDKW1WwVGrkRMmA2y9WZHXNHxMA6BSV";
  const slippage = 0.5;

  await swap({
    cobaltx,
    inputMint,
    inputAmount,
    outputMint,
    txVersion,
    slippage,
    owner,
    conn,
  });
}

if (require.main === module) {
  main();
}
