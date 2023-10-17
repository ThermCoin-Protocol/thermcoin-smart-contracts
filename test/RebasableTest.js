const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RebasableTest", function () {
    let ERC20Rebasable;
    let contract;
    let owner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        ERC20Rebasable = await ethers.getContractFactory("RebasableTest");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        contract = await ERC20Rebasable.deploy("TestToken", "TST");
        await contract.deployed();
    });

    it("should have correct name and symbol", async function () {
        expect(await contract.name()).to.equal("TestToken");
        expect(await contract.symbol()).to.equal("TST");
    });

    describe("Minting", function () {
        it("should allow owner to mint tokens", async function () {
            await contract.mint(owner.address, 1000);
            expect(await contract.balanceOf(owner.address)).to.equal(1000);
        });

        it("should emit Transfer event on mint", async function () {
            await expect(contract.mint(owner.address, 1000))
                .to.emit(contract, "Transfer")
                .withArgs(ethers.constants.AddressZero, owner.address, 1000);
        });
    });

    describe("Transfer", function () {
        beforeEach(async function () {
            await contract.mint(owner.address, 1000);
        });

        it("should transfer tokens between accounts", async function () {
            await contract.transfer(addr1.address, 500);
            expect(await contract.balanceOf(addr1.address)).to.equal(500);
            expect(await contract.balanceOf(owner.address)).to.equal(500);
        });

        it("should fail when transferring tokens from an account with insufficient balance", async function () {
            await expect(contract.connect(addr1).transfer(addr2.address, 1)).to.be.revertedWith(
                "ERC20: transfer amount exceeds balance"
            );
        });
    });

    describe("Rebase", function () {
        beforeEach(async function () {
            await contract.mint(owner.address, 1000);
        });

        it("should change the scaling factor", async function () {
            await contract.rebase(110);
            expect(await contract.getScalingFactor()).to.not.equal(100);
        });

        it("should emit Rebase event", async function () {
            await expect(contract.rebase(110))
                .to.emit(contract, "Rebase")
                .withArgs(100, 110);
        });

        it("should adjust balances based on scaling factor", async function () {
            await contract.transfer(addr1.address, 500);
            await contract.rebase(110);

            // owner and addr1 will still have 50% of the total supply after rebase.
            const totalSupply = await contract.totalSupply();
            expect(await contract.balanceOf(owner.address)).to.equal(totalSupply.div(2));
            expect(await contract.balanceOf(addr1.address)).to.equal(totalSupply.div(2));
        });

        it("should prevent rebase if percentageChange is out of bounds", async function () {
            await expect(contract.rebase(0)).to.be.revertedWith(
                "Percentage change should be between 1% and 1000%"
            );
            await expect(contract.rebase(1001)).to.be.revertedWith(
                "Percentage change should be between 1% and 1000%"
            );
        });
    });

    describe("Allowance", function () {
        beforeEach(async function () {
            await contract.mint(owner.address, 1000);
        });

        it("should correctly set allowance between accounts", async function () {
            await contract.approve(addr1.address, 500);
            expect(await contract.allowance(owner.address, addr1.address)).to.equal(500);
        });

        it("should emit Approval event on allowance change", async function () {
            await expect(contract.approve(addr1.address, 500))
                .to.emit(contract, "Approval")
                .withArgs(owner.address, addr1.address, 500);
        });

        it("should correctly modify allowance using increaseAllowance and decreaseAllowance", async function () {
            await contract.approve(addr1.address, 500);

            await contract.increaseAllowance(addr1.address, 100);
            expect(await contract.allowance(owner.address, addr1.address)).to.equal(600);

            await contract.decreaseAllowance(addr1.address, 200);
            expect(await contract.allowance(owner.address, addr1.address)).to.equal(400);
        });
    });

    describe("Conversion utilities", function () {
        beforeEach(async function () {
            await contract.mint(owner.address, 1000);
        });

        it("should convert normalized amount to scaled amount", async function () {
            await contract.rebase(200);
            expect(await contract.getScaledAmount(100)).to.equal(200);
        });

        it("should convert scaled amount to normalized amount", async function () {
            await contract.rebase(200);
            expect(await contract.getNormalizedAmount(200)).to.equal(100);
        });
    });

    describe("TokenRebasing", function () {
        beforeEach(async function () {
            await contract.mint(owner.address, 1000);
        });
        it("Owner should have correct amt of tokens before/after a rebase cycle", async function () {
            expect(await contract.balanceOf(owner.address)).to.equal(1000);
            await contract.rebase(200);
            expect(await contract.balanceOf(owner.address)).to.equal(2000);
        })
    })
});