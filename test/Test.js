const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");

describe("ThermCoin", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  const initialSupply = 10;
  const baseTxFee = 1;
  const feeIncrement = 0;
  const volumeThreshold = 1000;
  const supplyDelta = 10;

  async function deployThermCoinFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const ThermCoin = await ethers.getContractFactory("ThermCoin");
    const token = await ThermCoin.deploy(
      initialSupply,
      baseTxFee,
      feeIncrement,
      volumeThreshold
    );

    return { token, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should assign the total supply of tokens to the owner", async function () {
      const { token, owner } = await loadFixture(deployThermCoinFixture);
      const total = await token.totalSupply();
      expect(total).to.equal(await token.balanceOf(owner.address));
    });
    it("Owner should be in holder list", async function () {
      const { token, owner } = await loadFixture(deployThermCoinFixture);
      const holderList = await token.getHolders();
      expect(holderList[0]).to.equal(owner.address);
    });
    it("HolderList should be size of 1", async function () {
      const { token } = await loadFixture(deployThermCoinFixture);
      const holderList = await token.getHolders();
      expect(holderList.length).to.equal(1);
    });
    it("Should have correct fee params", async function () {
      const { token } = await loadFixture(deployThermCoinFixture);
      const params = await token.getFeeParams();
      expect(params[0]).to.equal(1);
      expect(params[1]).to.equal(0);
      expect(params[2]).to.equal(1000);
    });
  });
  describe("Administation", function () {
    it("Should allow owner to change fee params", async function () {
      const { token, owner } = await loadFixture(deployThermCoinFixture);
      await token.setFeeParams(2, 0, 100);
      const params = await token.getFeeParams();
      expect(params[0]).to.equal(2);
      expect(params[1]).to.equal(0);
      expect(params[2]).to.equal(100);
    });
    it("Should not allow non-owner to change fee params", async function () {
      const { token, otherAccount } = await loadFixture(deployThermCoinFixture);
      await expect(
        token.connect(otherAccount).setFeeParams(2, 2, 2)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("Holder List", function () {
    it("Should add to holder list on transfer", async function () {
      const { token, owner, otherAccount } = await loadFixture(
        deployThermCoinFixture
      );
      await token.transfer(otherAccount.address, 100);
      const holderList = await token.getHolders();
      expect(holderList[1]).to.equal(otherAccount.address);
    });
    it("Should remove from holder list on transfer", async function () {
      const { token, owner, otherAccount } = await loadFixture(
        deployThermCoinFixture
      );
      await token.transfer(otherAccount.address, 100);
      await token
        .connect(otherAccount)
        .transfer(owner.address, token.balanceOf(otherAccount.address));
      const holderList = await token.getHolders();
      expect(holderList.length).to.equal(1);
    });
    it("Should add to holder list on mint", async function () {
      const { token, owner, otherAccount } = await loadFixture(
        deployThermCoinFixture
      );
      await token.mint(otherAccount.address, 100);
      const holderList = await token.getHolders();
      expect(holderList[1]).to.equal(otherAccount.address);
    });
  });
  describe("Rebase", function () {
    it("Should rebase correctly", async function () {
      const { token, owner, otherAccount } = await loadFixture(
        deployThermCoinFixture
      );
      await token.mint(otherAccount.address, 10);
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialOtherAccountBalance = await token.balanceOf(
        otherAccount.address
      );
      await token.rebaseAllAccounts(supplyDelta, true);
      const finalOwnerBalance = await token.balanceOf(owner.address);
      const finalOtherAccountBalance = await token.balanceOf(
        otherAccount.address
      );
      expect(finalOwnerBalance).to.equal(
        initialOwnerBalance.add(
          ethers.utils.parseEther(supplyDelta.toString()).div(2)
        )
      );
      expect(finalOtherAccountBalance).to.equal(
        initialOtherAccountBalance.add(
          ethers.utils.parseEther(supplyDelta.toString()).div(2)
        )
      );
    });
    it("Should not allow non-owner to rebase", async function () {
      const { token, otherAccount } = await loadFixture(deployThermCoinFixture);
      await expect(
        token.connect(otherAccount).rebaseAllAccounts(supplyDelta, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});

describe("Meta Transactions", function () {
  let MetaTransactionToken;
  let metaTransactionToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const initialSupply = 10;
  const baseTxFee = 1;
  const feeIncrement = 0;
  const volumeThreshold = 100;

  beforeEach(async function () {
    MetaTransactionToken = await ethers.getContractFactory("ThermCoin");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    metaTransactionToken = await MetaTransactionToken.deploy(
      initialSupply,
      baseTxFee,
      feeIncrement,
      volumeThreshold
    );
    await metaTransactionToken.deployed();
  });

  it("Should transfer tokens from owner to addr1 using a valid (owner) signature and the relayer (addr2)", async function () {
    const amount = ethers.utils.parseEther("5");
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future

    // Create the message to sign
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    // Sign the message
    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Get the initial ETH balance of the relayer
    const initialBalanceRelayer = await addr2.getBalance();

    // Get the initial ETH balance of the signer
    const initialBalanceSigner = await owner.getBalance();

    // Send the transaction using the relayer
    const tx = await metaTransactionToken
      .connect(addr2)
      .transferWithSignature(
        owner.address,
        addr1.address,
        amount,
        deadline,
        v,
        r,
        s
      );
    const receipt = await tx.wait();
    // Get the final ETH balance of the relayer
    const finalBalanceRelayer = await addr2.getBalance();

    // Check the result
    const addr1Balance = await metaTransactionToken.balanceOf(addr1.address);
    const fee = await metaTransactionToken.getTxFee();
    expect(addr1Balance).to.equal(amount.sub(fee));

    // Check the fee paid to the relayer
    const relayerBalance = await metaTransactionToken.balanceOf(addr2.address);
    expect(relayerBalance).to.equal(fee);

    // // Calculate the gas used
    const gasUsed = receipt.gasUsed.mul(tx.gasPrice);

    // // Check the ETH balance difference of the relayer
    expect(initialBalanceRelayer.sub(finalBalanceRelayer)).to.equal(gasUsed);

    // // Check that the signer's ETH balance has not changed
    const finalBalanceSigner = await owner.getBalance();
    expect(initialBalanceSigner).to.equal(finalBalanceSigner);
  });
  it("Should fail when the signature is invalid", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5");
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await addr2.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Execute & Assert
    await expect(
      metaTransactionToken
        .connect(addr2)
        .transferWithSignature(
          owner.address,
          addr1.address,
          amount,
          deadline,
          v,
          r,
          s
        )
    ).to.be.revertedWith("Invalid signature");
  });
  it("Should fail when the deadline has passed", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5");
    const deadline = Math.floor(Date.now() / 1000) - 60; // 1 minute in the past
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Execute & Assert
    await expect(
      metaTransactionToken
        .connect(addr2)
        .transferWithSignature(
          owner.address,
          addr1.address,
          amount,
          deadline,
          v,
          r,
          s
        )
    ).to.be.revertedWith("Signature expired");
  });
  it("Should fail when the signer doesn't have enough tokens", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5000"); // Assume the owner doesn't have this much
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Execute & Assert
    await expect(
      metaTransactionToken
        .connect(addr2)
        .transferWithSignature(
          owner.address,
          addr1.address,
          amount,
          deadline,
          v,
          r,
          s
        )
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });
  it("Should fail when nonce is reused", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5");
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Submit the transaction using the relayer
    await metaTransactionToken
      .connect(addr2)
      .transferWithSignature(
        owner.address,
        addr1.address,
        amount,
        deadline,
        v,
        r,
        s
      );

    // Try to reuse the nonce
    await expect(
      metaTransactionToken
        .connect(addr2)
        .transferWithSignature(
          owner.address,
          addr1.address,
          amount,
          deadline,
          v,
          r,
          s
        )
    ).to.be.revertedWith("Invalid signature");
  });
  it("Should fail when relayer tries to transfer more tokens than signer has authorized", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5");
    const unauthorizedAmount = ethers.utils.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Try to transfer more tokens than the signer has authorized
    await expect(
      metaTransactionToken
        .connect(addr2)
        .transferWithSignature(
          owner.address,
          addr1.address,
          unauthorizedAmount,
          deadline,
          v,
          r,
          s
        )
    ).to.be.revertedWith("Invalid signature");
  });
  it("Should transfer the correct amount of tokens when signer is also the relayer", async function () {
    // Setup
    const amount = ethers.utils.parseEther("5");
    const deadline = Math.floor(Date.now() / 1000) + 60; // 1 minute in the future
    const nonce = await metaTransactionToken.nonces(owner.address);
    const message = ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256"],
      [owner.address, addr1.address, amount, nonce, deadline]
    );

    const signature = await owner.signMessage(ethers.utils.arrayify(message));
    const { v, r, s } = ethers.utils.splitSignature(signature);

    // Submit the transaction using the owner as the relayer
    await metaTransactionToken
      .connect(owner)
      .transferWithSignature(
        owner.address,
        addr1.address,
        amount,
        deadline,
        v,
        r,
        s
      );

    // Calculate the fee
    const fee = await metaTransactionToken.getTxFee();

    // Check the result
    const addr1Balance = await metaTransactionToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(amount.sub(fee));
  });
});
