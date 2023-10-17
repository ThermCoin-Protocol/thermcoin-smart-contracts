// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Rebasable.sol";

// import console
import "hardhat/console.sol";

contract ThermCoin is Rebasable, Ownable {
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
    ) Rebasable("ThermCoin", "BTUC") {
        _mint(msg.sender, premintAmt * 10 ** decimals());
        _lastBlockNum = block.number;
        _baseFee = baseFee;
        _feeIncrement = feeIncrement;
        _volumeThreshold = volumeThreshold;
        _currentTxVolume = 0;
        _prevTxVolume = 0;
    }

    // Change each account's balance to match the new total supply
    function rebase(uint256 percentageChange) public onlyOwner {
        _rebase(percentageChange);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10 ** decimals());
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

    // Fee increases based on tx volume
    // Fee starts at the base fee
    // Increases by the fee increment every n transactions
    function getTxFee() public view returns (uint256) {
        return (_baseFee +
            (_feeIncrement * (_prevTxVolume / _volumeThreshold)));
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
}
