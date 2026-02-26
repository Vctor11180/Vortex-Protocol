// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function faucet() public {
        _mint(msg.sender, 1000 * 10 ** decimals());
    }
}
