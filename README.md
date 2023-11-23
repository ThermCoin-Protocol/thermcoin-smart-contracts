# ThermCoin Smart Contracts

## --- Addresses ---

Contract address: TBA <br/>

## --- TCFT/ERC20 High Level Overview ---

ThermCoin is an ERC20 token with several unique features, including meta-transactions, dynamic transaction fees,
rewards for pool operators, and unique token supply mechanics.

### Features:

**Meta Transactions**: ThermCoin uses meta transactions to avoid gas fee in native token for the end user. The transactions are processed by relayer's who

**ERC20 Standard**: ThermCoin is an ERC20-compliant token, which means it is compatible with most Ethereum wallets and decentralized applications.

**Transaction Fee**: The contract implements a dynamic transaction fee mechanism, which is distributed among whitelisted pool operators and meta transaction relayer's.

**Rebase Token Supply**: The token supply is rebased every ~year, proportional to global enery production. Every user's balance is adjusted equitably.

## --- ERC20 Token created with OpenZepellin ---

## --- Hardhat ---

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy.js --network thermcoin_dev
npx hardhat run scripts/deploy.js --network thermcoin_prod
```
