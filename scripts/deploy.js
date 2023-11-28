// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // --------------------------------------------------------- //
  // ~ 6,103,945,193,427 Therms of energy produced in 2022:
  // Source:
  //  https://ourworldindata.org/energy-production-consumption
  // --------------------------------------------------------- //
  const premintAmt = 16000000000;
  const baseTxFee = 1;
  const feeIncrement = 1;
  const volumeThreshold = 1000;
  const [deployer] = await ethers.getSigners();
  console.log("\n");
  console.log("-------------------- ACCOUNTS --------------------");
  console.log("Deployer: ", deployer.address);
  console.log("--------------------------------------------------");

  console.log("\n");
  console.log("-------------------- INITIAL STATE --------------------");
  console.log("Deploying contracts with the account:", deployer.address);
  const initialBalance = await deployer.getBalance();

  const Token = await ethers.getContractFactory("ThermCoin");
  const token = await Token.deploy(
    premintAmt,
    baseTxFee,
    feeIncrement,
    volumeThreshold
  );
  console.log("Token address:", token.address);
  console.log(
    "Deployer ThermCoin balance: ",
    hre.ethers.utils.formatUnits(await token.balanceOf(deployer.address), 18)
  );
  const finalBalance = await deployer.getBalance();
  console.log("L1 gas used: ", initialBalance.sub(finalBalance).toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
