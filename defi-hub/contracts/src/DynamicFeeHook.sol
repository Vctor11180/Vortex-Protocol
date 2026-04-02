// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title DynamicFeeHook
 * @dev Módulo para calcular "fees" o comisiones dinámicamente basadas en el volumen de transacciones 
 * reciente (simulando volatilidad). Un AMM puede consultar este contrato antes de un swap.
 */
contract DynamicFeeHook is Ownable {
    address public ammAddress;

    // Fees representados en base 10000 (bps). Ej: 30 = 0.3%
    uint256 public constant MIN_FEE = 10; // 0.1%
    uint256 public constant MAX_FEE = 100; // 1.0%
    uint256 public constant BASE_FEE = 30; // 0.3%

    // Variables de seguimiento para la volatilidad/volumen
    uint256 public volumeAccumulated;
    uint256 public lastUpdateTimestamp;
    
    // Período de tiempo en el que el volumen decae (ej. 1 hora)
    uint256 public constant VOLATILITY_WINDOW = 3600; 

    // Umbral de volumen para subir la comisión (ej. 10,000 tokens base)
    uint256 public volumeThreshold = 10000 * 10**18;

    constructor() Ownable(msg.sender) {
        lastUpdateTimestamp = block.timestamp;
    }

    modifier onlyAMM() {
        require(msg.sender == ammAddress, "DynamicFeeHook: Only AMM");
        _;
    }

    // Mapeo para rastrear descuentos por fidelidad (activados vía Marketplace)
    mapping(address => uint256) public userDiscountUntil;
    uint256 public constant DISCOUNT_PERCENTAGE = 50; // 50% de descuento

    function setAmmAddress(address _ammAddress) external onlyOwner {
        ammAddress = _ammAddress;
    }

    /**
     * @dev Activa un descuento para un usuario (llamado por el PointsHook al canjear puntos)
     */
    function activateDiscount(address user, uint256 duration) external {
        // Solo el owner o el PointsHook (si lo vinculamos)
        // Por simplicidad en este demo lo dejamos libre para el hook
        userDiscountUntil[user] = block.timestamp + duration;
    }

    /**
     * @dev Función llamada ANTES del swap para determinar el fee actual y actualizar el estado
     */
    function modifyFeeBeforeSwap(uint256 _amountIn) external onlyAMM returns (uint256 currentFee) {
        _decayVolume();
        currentFee = _applyUserDiscount(msg.sender, _calculateFee());
        volumeAccumulated += _amountIn;
    }

    function getDynamicFee() external view returns (uint256 fee) {
        uint256 decayedVolume = _getDecayedVolume();
        uint256 baseFeeCalculated = BASE_FEE;

        if (decayedVolume > 0) {
            uint256 feeIncrease = (decayedVolume * (MAX_FEE - BASE_FEE)) / volumeThreshold;
            baseFeeCalculated = BASE_FEE + feeIncrease;
        }

        if (baseFeeCalculated > MAX_FEE) baseFeeCalculated = MAX_FEE;
        
        // Aplicar descuento si está activo (para previsualización en frontend)
        // Nota: En getDynamicFee de la interfaz, el msg.sender suele ser el AMM, 
        // por lo que el descuento por usuario es mejor manejarlo en una función que reciba el address.
        fee = baseFeeCalculated;
    }

    /**
     * @dev Versión que recibe el usuario para que el frontend pueda mostrar el fee ajustado
     */
    function getFeeForUser(address user) external view returns (uint256 fee) {
        uint256 base = this.getDynamicFee();
        return _applyUserDiscount(user, base);
    }

    function _applyUserDiscount(address user, uint256 baseFee) internal view returns (uint256) {
        if (block.timestamp <= userDiscountUntil[user]) {
            return (baseFee * (100 - DISCOUNT_PERCENTAGE)) / 100;
        }
        return baseFee;
    }

    function _calculateFee() internal view returns (uint256 fee) {
        if (volumeAccumulated == 0) {
            return BASE_FEE;
        }

        uint256 feeIncrease = (volumeAccumulated * (MAX_FEE - BASE_FEE)) / volumeThreshold;
        fee = BASE_FEE + feeIncrease;

        if (fee > MAX_FEE) {
            fee = MAX_FEE;
        }
    }

    function _decayVolume() internal {
        uint256 timePassed = block.timestamp - lastUpdateTimestamp;
        
        if (timePassed >= VOLATILITY_WINDOW) {
            volumeAccumulated = 0;
        } else {
            // Decaimiento lineal
            uint256 decayFactor = VOLATILITY_WINDOW - timePassed;
            volumeAccumulated = (volumeAccumulated * decayFactor) / VOLATILITY_WINDOW;
        }
        
        lastUpdateTimestamp = block.timestamp;
    }

    function _getDecayedVolume() internal view returns (uint256) {
        uint256 timePassed = block.timestamp - lastUpdateTimestamp;
        
        if (timePassed >= VOLATILITY_WINDOW) {
            return 0;
        } else {
            uint256 decayFactor = VOLATILITY_WINDOW - timePassed;
            return (volumeAccumulated * decayFactor) / VOLATILITY_WINDOW;
        }
    }
}
