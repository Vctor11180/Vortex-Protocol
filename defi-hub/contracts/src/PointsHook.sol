// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "openzeppelin-contracts/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract PointsHook is ERC1155, Ownable {
    uint256 public constant POINT_ID = 1;
    address public ammAddress;
    address public dynamicFeeHookAddress;

    constructor() ERC1155("https://api.defihub.local/metadata/{id}.json") Ownable(msg.sender) {}

    function setAmmAddress(address _ammAddress) external onlyOwner {
        ammAddress = _ammAddress;
    }

    function setDynamicFeeHook(address _dynamicFeeHook) external onlyOwner {
        dynamicFeeHookAddress = _dynamicFeeHook;
    }

    modifier onlyAMM() {
        require(msg.sender == ammAddress, "PointsHook: Only AMM can call this");
        _;
    }

    event RewardRedeemed(address indexed user, uint256 indexed rewardId, uint256 amount);

    // Called after a successful swap to mint points to the user
    function afterSwap(address user, uint256 swapAmountIn) external onlyAMM {
        uint256 pointsToMint = (swapAmountIn * 1) / 100;
        if (pointsToMint > 0) {
            _mint(user, POINT_ID, pointsToMint, "");
        }
    }

    /**
     * @dev Permite a los usuarios canjear sus puntos por beneficios.
     * @param rewardId ID 101: Descuento de Fee por 24h.
     */
    function redeem(uint256 rewardId, uint256 amount) external {
        require(balanceOf(msg.sender, POINT_ID) >= amount, "PointsHook: Insufficient points");
        
        // Quema de puntos (Redención)
        _burn(msg.sender, POINT_ID, amount);

        // Lógica de activación de beneficio real
        if (rewardId == 101 && dynamicFeeHookAddress != address(0)) {
            // Activar descuento de 24 horas (86400 segundos)
            (bool success, ) = dynamicFeeHookAddress.call(
                abi.encodeWithSignature("activateDiscount(address,uint256)", msg.sender, 86400)
            );
            require(success, "PointsHook: Failed to activate discount");
        }

        emit RewardRedeemed(msg.sender, rewardId, amount);
    }
}
