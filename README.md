# ThermCoin Smart Contracts

## --- Addresses ---

Contract: 0xB5db108Cb7378c2Fd680e934686BCb81F63aDB49 <br/>
Owner: 0xb0b85Ae295dDa42E7E189864cA1251703F3b8254 <br/>

## --- TCFT/ERC20 High Level Overview ---

ThermCoin is an ERC20 token with several unique features, including meta-transactions, dynamic transaction fees,
rewards for pool operators, and unique token supply mechanics.

### Features:

**Meta Transactions**: ThermCoin uses meta transactions to avoid gas fee in native token for the end user. The transactions are processed by relayer's who

**ERC20 Standard**: ThermCoin is an ERC20-compliant token, which means it is compatible with most Ethereum wallets and decentralized applications.

**Transaction Fee**: The contract implements a dynamic transaction fee mechanism, which is distributed among whitelisted pool operators and meta transaction relayer's.

**Reward Pool Operators**: The contract tracks and approves pool operators, who can earn rewards in the form of newly minted tokens and user transaction fees.

**Rebase Token Supply**: The token supply is rebased every ~year, proportional to global enery production (This data is collected via Chainlink Oracles). Every user's balance is adjusted equitably.

**Iterable Holder Mapping**: The contract utilizes an iterable mapping for holders to improve efficiency when updating the holder list or performing a rebase operation.

## --- ERC20 Token created with OpenZepellin ---

## --- Hardhat ---

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```
