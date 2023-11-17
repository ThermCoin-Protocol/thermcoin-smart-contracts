require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Replace this private key with your Sepolia account private key
// To export your private key from Coinbase Wallet, go to
// Settings > Developer Settings > Show private key
// To export your private key from Metamask, open Metamask and
// go to Account Details > Export Private Key
// Beware: NEVER put real Ether into testing accounts
const THERMCOIN_PRIVATE_KEY = process.env.PRIVATE_KEY;
const LOCAL_URL = process.env.LOCAL_URL;
const PUBLIC_URL = process.env.PUBLIC_URL;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    thermcoin_dev: {
      url: LOCAL_URL,
      accounts: [THERMCOIN_PRIVATE_KEY],
    },
    thermcoin_prod: {
      url: PUBLIC_URL,
      accounts: [THERMCOIN_PRIVATE_KEY],
    },
  },
};
