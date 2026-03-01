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

    function setAmmAddress(address _ammAddress) external onlyOwner {
        ammAddress = _ammAddress;
    }

    function setVolumeThreshold(uint256 _threshold) external onlyOwner {
        volumeThreshold = _threshold;
    }

    /**
     * @dev Función llamada ANTES del swap para determinar el fee actual y actualizar el estado
     */
    function modifyFeeBeforeSwap(uint256 _amountIn) external onlyAMM returns (uint256 currentFee) {
        // 1. Aplicar "decaimiento" del volumen pasado basado en el tiempo
        _decayVolume();

        // 2. Calcular el fee actual según el volumen acumulado existente antes del swap
        currentFee = _calculateFee();

        // 3. Añadir el nuevo volumen para futuros cálculos de fee
        volumeAccumulated += _amountIn;
    }

    /**
     * @dev Obtiene el fee dinámico actual en "view" para que el frontend o contrato pueda previsualizarlo
     */
    function getDynamicFee() external view returns (uint256 fee) {
        uint256 decayedVolume = _getDecayedVolume();
        
        if (decayedVolume == 0) {
            return BASE_FEE;
        }

        // Cálculo lineal simple para escalar el fee desde MIN_FEE a MAX_FEE basado en el umbral
        // Ej: ratio = volume / threshold
        uint256 feeIncrease = (decayedVolume * (MAX_FEE - BASE_FEE)) / volumeThreshold;
        
        fee = BASE_FEE + feeIncrease;

        if (fee > MAX_FEE) {
            fee = MAX_FEE;
        }
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
