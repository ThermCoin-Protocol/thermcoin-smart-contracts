// Import ethers from Hardhat package
const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("ERC20 Distribute Reward", function () {
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const initialSupply = ethers.utils.parseEther("20"); // Changed to a more realistic initial supply
  const baseTxFee = ethers.utils.parseUnits("1", "wei");
  const feeIncrement = ethers.utils.parseUnits("0", "wei");
  const volumeThreshold = ethers.utils.parseUnits("1000", "wei");

  // `beforeEach` runs before each test, deploying a new contract instance
  beforeEach(async function () {
    // Get the ContractFactory and Signers here.
    const ThermCoin = await ethers.getContractFactory("ThermCoin");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    // Deploy the contract
    token = await ThermCoin.deploy(
      initialSupply,
      baseTxFee,
      feeIncrement,
      volumeThreshold
    );
    await token.deployed();
  });

  // Test case for successful distribution
  it("should distribute tokens to each address", async function () {
    const distributionAmount = ethers.utils.parseEther("10"); // The amount to be distributed to each recipient

    // Prepare the recipients array
    const recipients = [addr1.address, addr2.address];

    // Call the distributeReward function
    await token.distributeReward(recipients, distributionAmount, 0, recipients.length);

    // Verify balances
    expect(await token.balanceOf(addr1.address)).to.equal(distributionAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(distributionAmount);
  });

  // Add more test cases as needed
});