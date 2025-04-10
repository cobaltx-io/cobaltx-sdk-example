import { CobaltX, CLMM_PROGRAM_ID } from "@cobaltx/sdk-v2";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AccountLoader, getConnection } from "./utils";
require("dotenv").config();

export async function initSdk(params: {
  owner: PublicKey;
  conn: Connection;
  cluster: "mainnet" | "devnet";
  loadToken?: boolean;
}) {
  let cobaltx = await CobaltX.load({
    owner: new PublicKey(params.owner),
    connection: params.conn,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
  });

  return cobaltx;
}

export interface PositionInfo {
  poolId: PublicKey;
  nftMint: PublicKey;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
  tokenFeesOwedA: string;
  tokenFeesOwedB: string;
  rewardInfos: {
    growthInsideLastX64: string;
    rewardAmountOwed: string;
  }[];
}

async function getPositions({
  cobaltx,
  programId,
}: {
  cobaltx: CobaltX;
  programId: PublicKey;
}): Promise<PositionInfo[]> {
  // Fetch wallet token accounts
  await cobaltx.account.fetchWalletTokenAccounts();
  
  // Get all positions
  const positions = await cobaltx.clmm.getOwnerPositionInfo({
    programId,
  });

  return positions.map(position => ({
    poolId: position.poolId,
    nftMint: position.nftMint,
    liquidity: position.liquidity.toString(),
    tickLower: position.tickLower,
    tickUpper: position.tickUpper,
    tokenFeesOwedA: position.tokenFeesOwedA.toString(),
    tokenFeesOwedB: position.tokenFeesOwedB.toString(),
    rewardInfos: position.rewardInfos.map(reward => ({
      growthInsideLastX64: reward.growthInsideLastX64.toString(),
      rewardAmountOwed: reward.rewardAmountOwed.toString(),
    })),
  }));
}

async function main() {
  const al = new AccountLoader();
  const userAddress = process.env.USER_ADDRESS;
  const conn = getConnection("mainnet");

  if (!userAddress) {
    throw new Error('Please set USER_ADDRESS in .env file');
  }
  
  const cobaltx = await initSdk({
    owner: new PublicKey(userAddress),
    conn,
    cluster: "mainnet",
    loadToken: true,
  });

  try {
    console.log('Fetching CLMM positions...');
    const positions = await getPositions({
      cobaltx,
      programId: CLMM_PROGRAM_ID,
    });

    if (positions.length === 0) {
      console.log('No CLMM positions found for this address');
      return;
    }

    console.log(`Found ${positions.length} CLMM positions:`);
    console.log('----------------------------------------');

    positions.forEach((position, index) => {
      console.log(`Position ${index + 1}:`);
      console.log(`Pool ID: ${position.poolId.toBase58()}`);
      console.log(`NFT Mint: ${position.nftMint.toBase58()}`);
      console.log(`Liquidity: ${position.liquidity}`);
      console.log(`Tick Lower: ${position.tickLower}`);
      console.log(`Tick Upper: ${position.tickUpper}`);
      console.log(`Token Fees Owed A: ${position.tokenFeesOwedA}`);
      console.log(`Token Fees Owed B: ${position.tokenFeesOwedB}`);
      console.log('Reward Infos:');
      position.rewardInfos.forEach((reward, rewardIndex) => {
        console.log(`  Reward ${rewardIndex + 1}:`);
        console.log(`    Growth Inside Last X64: ${reward.growthInsideLastX64}`);
        console.log(`    Reward Amount Owed: ${reward.rewardAmountOwed}`);
      });
      console.log('----------------------------------------');
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
} 