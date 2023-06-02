// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// import console
import "hardhat/console.sol";

contract ThermCoin is ERC20, ERC20Burnable, Ownable {
    // Tokenomics
    uint256 private _baseFee; // Transaction fee (in wei)
    uint256 private _feeIncrement; // Fee increment (in wei)
    uint256 private _volumeThreshold; // Tx volume threshold (in # of tx)

    // Track block/tx data
    uint256 private _lastBlockNum; // Last block number
    uint256 private _currentTxVolume; // Transaction volume counter
    uint256 private _prevTxVolume; // Previous transaction volume

    // SafeMath uint256
    using SafeMath for uint256;

    constructor(
        uint256 premintAmt,
        uint256 baseFee,
        uint256 feeIncrement,
        uint256 volumeThreshold
    ) ERC20("ThermCoin", "BTUC") {
        _mint(msg.sender, premintAmt * 10 ** decimals());
        _updateHolder(msg.sender);
        _lastBlockNum = block.number;
        _baseFee = baseFee;
        _feeIncrement = feeIncrement;
        _volumeThreshold = volumeThreshold;
        _currentTxVolume = 0;
        _prevTxVolume = 0;
    }

    /* -------------------------- */
    /* Meta Transaction functions */
    /* -------------------------- */

    // Meta Transaction utilities
    using ECDSA for bytes32;
    mapping(address => uint256) private _nonces;

    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner];
    }

    // Called by relayer to transfer token's on behalf of a user
    // Relayer must pay gas fee
    function transferWithSignature(
        address from, // The address of the token sender.
        address to, // The address of the token receiver.
        uint256 amount, // The amount of tokens to be transferred.
        uint256 deadline, // The deadline after which this transaction should not be processed.
        uint8 v, // The recovery id (also known as `v`) of the signature.
        bytes32 r, // The `r` component of the signature.
        bytes32 s // The `s` component of the signature.
    ) public {
        require(amount >= getTxFee(), "Fee cannot exceed amount"); // Prevent overflow
        // Create a unique hash from the transaction details and the sender's nonce
        bytes32 hash = keccak256(
            abi.encodePacked(from, to, amount, _nonces[from]++, deadline)
        );
        // Convert the hash to an Ethereum signed message hash.
        // This is necessary because `ecrecover` expects Ethereum specific prefix
        hash = hash.toEthSignedMessageHash();
        // Recover the address of the signer from the signature.
        address signer = hash.recover(v, r, s); // This should be the same as the `from` address if the signature is valid.
        // Check that the signer is the `from` address and not the zero address.
        // This ensures that the signature is valid and is from the sender of the tokens.
        require(signer != address(0) && signer == from, "Invalid signature");
        // Check that the current time is less than the deadline.
        // This prevents processing of transactions that are too old.
        require(block.timestamp <= deadline, "Signature expired");
        // Calculate transaction fee
        uint256 fee = _calculateTxFee();
        // Transfer the tokens from the sender to the receiver.
        _transfer(from, to, amount - fee);
        // Transfer the fee from the sender to the relayer (the sender of this transaction).
        _transfer(from, msg.sender, fee);
    }

    /* ------------------------ */
    /* Administrative functions */
    /* ------------------------ */

    // Mint tokens to a wallet (Call this function in ether units)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10 ** decimals());
        _updateHolder(to);
    }

    /* ---------------- */
    /* Holder functions */
    /* ---------------- */

    struct Holder {
        bool exists;
        uint256 index;
    }

    mapping(address => Holder) private _holderData; // For efficient lookup
    address[] private _holders; // Tracks all token holders

    // Add or remove wallet from holders list
    function _updateHolder(address wallet) private {
        if (balanceOf(wallet) > 0 && !_holderData[wallet].exists) {
            _holderData[wallet] = Holder({
                exists: true,
                index: _holders.length
            });
            _holders.push(wallet);
        } else if (balanceOf(wallet) == 0 && _holderData[wallet].exists) {
            address lastHolder = _holders[_holders.length - 1];

            uint256 removedHolderIndex = _holderData[wallet].index;
            _holders[removedHolderIndex] = lastHolder;
            _holderData[lastHolder].index = removedHolderIndex;

            _holders.pop();
            delete _holderData[wallet];
        }
    }

    // Returns all accounts with token balance
    function getHolders() public view returns (address[] memory) {
        return _holders;
    }

    /* --------------- */
    /* Rebase Function */
    /* --------------- */

    // Change each account's balance to match the new total supply
    function rebaseAllAccounts(
        uint256 supplyDelta,
        bool increase
    ) public onlyOwner returns (uint256 delta) {
        uint256 totalSupply = totalSupply();
        supplyDelta = supplyDelta * 10 ** decimals();
        for (uint256 i = 0; i < _holders.length; i++) {
            address holder = _holders[i];
            uint256 holderBalance = balanceOf(holder);
            uint256 holderDelta = holderBalance.mul(supplyDelta).div(
                totalSupply
            );
            if (increase) {
                _mint(holder, holderDelta);
            } else {
                _burn(holder, holderDelta);
            }
        }

        uint256 newSupply = super.totalSupply();
        return newSupply;
    }

    /* -------------------------- */
    /* Transfer and Tx Fee helper */
    /* -------------------------- */

    function setFeeParams(
        uint256 newBase,
        uint256 newIncrement,
        uint256 newThreshold
    ) public onlyOwner {
        _baseFee = newBase;
        _feeIncrement = newIncrement;
        _volumeThreshold = newThreshold;
    }

    function getFeeParams() public view returns (uint256, uint256, uint256) {
        return (_baseFee, _feeIncrement, _volumeThreshold);
    }

    function _calculateTxFee() private returns (uint256) {
        uint256 fee = getTxFee();
        _currentTxVolume++;
        if (_lastBlockNum != block.number) {
            _prevTxVolume = _currentTxVolume;
            _currentTxVolume = 0;
            _lastBlockNum = block.number;
        }
        return fee;
    }

    // Fee increases based on tx volume, fee factors, and fiboncacci sequence
    function getTxFee() public view returns (uint256) {
        if (_prevTxVolume < _volumeThreshold) {
            return (_baseFee);
        } else if (_prevTxVolume < 2 * _volumeThreshold) {
            return (_baseFee + _feeIncrement);
        } else if (_prevTxVolume < 3 * _volumeThreshold) {
            return (_baseFee + (_feeIncrement * 2));
        } else if (_prevTxVolume < 5 * _volumeThreshold) {
            return (_baseFee + (_feeIncrement * 3));
        } else if (_prevTxVolume < 8 * _volumeThreshold) {
            return (_baseFee + (_feeIncrement * 4));
        } else if (_prevTxVolume < 13 * _volumeThreshold) {
            return (_baseFee + (_feeIncrement * 5));
        } else if (_prevTxVolume < 21 * _volumeThreshold) {
            return (_baseFee + (_feeIncrement * 6));
        } else {
            return (_baseFee + (_feeIncrement * 7));
        }
    }

    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        bool txStatus = super.transfer(to, amount); // Transfer tokens
        // Update holders
        _updateHolder(to);
        _updateHolder(msg.sender);
        return txStatus;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        bool txStatus = super.transferFrom(from, to, amount); // Transfer tokens
        // Update holders
        _updateHolder(to);
        _updateHolder(from);
        return txStatus;
    }
}
