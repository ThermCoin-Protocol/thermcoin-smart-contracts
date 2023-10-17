// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Rebasable.sol";

contract RebasableTest is Rebasable {
    constructor(
        string memory name_,
        string memory symbol_
    ) Rebasable(name_, symbol_) {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function rebase(uint256 percentageChange) public {
        _rebase(percentageChange);
    }
}
