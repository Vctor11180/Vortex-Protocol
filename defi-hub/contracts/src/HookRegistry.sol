// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title HookRegistry
 * @dev Centralized registry for AMM hooks in Vortex Protocol.
 * This allows the protocol to upgrade loyalty logic without migrating liquidity.
 */
contract HookRegistry is Ownable {
    address public pointsHook;
    address public dynamicFeeHook;

    event HookUpdated(string indexed hookType, address indexed oldAddress, address indexed newAddress);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Updates the PointsHook address.
     * @param _pointsHook New address for the PointsHook.
     */
    function updatePointsHook(address _pointsHook) external onlyOwner {
        emit HookUpdated("Points", pointsHook, _pointsHook);
        pointsHook = _pointsHook;
    }

    /**
     * @dev Updates the DynamicFeeHook address.
     * @param _dynamicFeeHook New address for the DynamicFeeHook.
     */
    function updateDynamicFeeHook(address _dynamicFeeHook) external onlyOwner {
        emit HookUpdated("DynamicFee", dynamicFeeHook, _dynamicFeeHook);
        dynamicFeeHook = _dynamicFeeHook;
    }

    /**
     * @dev Returns the current active hooks.
     */
    function getHooks() external view returns (address _pointsHook, address _dynamicFeeHook) {
        return (pointsHook, dynamicFeeHook);
    }
}
