# CobaltX SDK Example

This project demonstrates how to use the CobaltX SDK to perform token swaps on the Solana blockchain. It provides a simple implementation for interacting with CobaltX's decentralized exchange functionality.

## Features

- Token swapping on Solana blockchain
- Support for both mainnet and devnet environments
- Secure private key management through environment variables
- Configurable transaction parameters (slippage, swap type, etc.)

## Prerequisites

- Node.js
- npm or yarn
- Solana wallet with private key
- Basic understanding of Solana blockchain concepts

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following:

```env
PRIVATE_KEY=your_base58_encoded_private_key
```

⚠️ Never commit your private key or .env file to version control!

## Project Structure

- `src/swap.ts` - Main implementation of token swap functionality
- `src/utils.ts` - Utility functions for Solana connection and transaction handling
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

## Usage

1. Build the project:
```bash
npm run build
```

2. Run the example swap:
```bash
npm start
```

The example performs a swap with the following default parameters:
- Pool ID: "646x4X8ENfqjeVHPkhkiqSaB4qqZBYnKrVC9hqZJCZBp"
- Input Token: SOL (So11111111111111111111111111111111111111112)
- Input Amount: 100 (in smallest units)
- Slippage: 1%
- Swap Type: BaseIn

## Key Dependencies

- @cobaltx/sdk-v2: ^0.0.3
- @solana/web3.js: ^1.98.0
- bn.js: ^5.2.1
- decimal.js: ^10.5.0
- bs58: ^6.0.0

## License

MIT

## Notes

- The project uses TypeScript for type safety
- Transactions are configured to use the "confirmed" commitment level
- Both mainnet and devnet environments are supported through the connection utility
- Error handling is implemented for transaction failures 