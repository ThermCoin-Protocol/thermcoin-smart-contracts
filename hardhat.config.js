require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Replace this private key with your Sepolia account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const THERMCOIN_PRIVATE_KEY = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    thermcoin: {
      url: `http://172.13.119.20:8545`,
      accounts: [THERMCOIN_PRIVATE_KEY],
    },
  },
};
