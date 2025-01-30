import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

/**
 * Loads the connection to the Solana blockchain.
 * This uses the default endpoint for the cluster.
 */
export function getConnection(
  cluster: "mainnet" | "devnet" = "devnet"
): Connection {
  const endpoint =
    cluster === "mainnet"
      ? "https://rpc.mainnet.soo.network/rpc"
      : "https://rpc.testnet.soo.network/rpc";
  return new Connection(endpoint, "confirmed");
}

/**
 * Sends a transaction to the Solana blockchain and logs the result.
 */
export async function sendTxn(
  transaction: Promise<string[]>,
  description: string
): Promise<void> {
  try {
    const txId = await transaction;
    console.log(`${description} successful. Transaction ID: ${txId}`);
  } catch (error) {
    console.error(`${description} failed.`, error);
  }
}

/**
 * Utility class for managing accounts.
 */
export class AccountLoader {
  /**
   * Loads a Keypair from an encrypted file.
   */
  getKeypairFromEnvironmentDecrypt(): Keypair {
    // Decode the base58-encoded private key from environment variable
    const privateKeyBase58 = process.env.PRIVATE_KEY as string;
    const privateKeyBuffer = bs58.decode(privateKeyBase58);

    // Check if the decoded private key length is valid (should be 64 bytes)
    if (privateKeyBuffer.length !== 64) {
      throw new Error("bad secret key size");
    }

    return Keypair.fromSecretKey(Uint8Array.from(privateKeyBuffer));
  }
}
