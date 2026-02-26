// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract PointsHook is ERC1155, Ownable {
    uint256 public constant POINT_ID = 1;
    address public ammAddress;

    constructor() ERC1155("https://api.defihub.local/metadata/{id}.json") Ownable(msg.sender) {}

    function setAmmAddress(address _ammAddress) external onlyOwner {
        ammAddress = _ammAddress;
    }

    modifier onlyAMM() {
        require(msg.sender == ammAddress, "PointsHook: Only AMM can call this");
        _;
    }

    // Called after a successful swap to mint points to the user
    // The amount of points is proportional to the swap volume
    function afterSwap(address user, uint256 swapAmountIn) external onlyAMM {
        // Mint 1 POINT per 100 tokens swapped (adjusted for decimals simplistically)
        // Assuming matching decimals, in a real scenario we use USD value or similar
        uint256 pointsToMint = (swapAmountIn * 1) / 100;
        
        if (pointsToMint > 0) {
            _mint(user, POINT_ID, pointsToMint, "");
        }
    }
}
