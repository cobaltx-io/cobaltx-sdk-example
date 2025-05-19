import { API_URLS, getApiUrl, getCLMMProgramId } from "@cobaltx/sdk-v2";
import { NetworkName } from "@cobaltx/sdk-v2/lib/config";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import axios from "axios";

/**
 * Loads the connection to the Solana blockchain.
 * This uses the default endpoint for the cluster.
 */
export async function getConnection(network: NetworkName): Promise<Connection> {
  const rpc = await axios.get(getApiUrl(network).BASE_HOST + API_URLS.RPCS).then(res => res.data)
  return new Connection(rpc.data.rpcs[0].url, "confirmed");
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

export const VALID_PROGRAM_ID = getCLMMProgramId(NetworkName.sooneth).toBase58()

export const isValidClmm = (id: string) => VALID_PROGRAM_ID === id