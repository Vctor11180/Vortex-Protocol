// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AMM} from "./AMM.sol";

/**
 * @title PositionManager
 * @dev Contrato periférico para agrupar múltiples posiciones de liquidez de usuarios.
 * Muestra técnicas de optimización leyendo variables agrupadas en storage directo usando Yul (assembly)
 * para ahorrar gas simulando técnicas estilo batch sload / extsload.
 */
contract PositionManager {
    AMM public immutable amm;

    // Estructura empaquetada (ocupa 1 solo slot de 256 bits): 
    // uint128 (aprox 3.4e38, sobra para shares) + uint128 = 256
    struct Position {
        uint128 sharesTkna;
        uint128 sharesTknb;
    }

    // slot keccak mapping
    mapping(address => Position) public userPositions;

    constructor(address _amm) {
        amm = AMM(_amm);
    }

    /**
     * @dev Registra una posición simulada en el manager de manera empaquetada 
     *      (en producción interactuaría depositando en AMM).
     */
    function depositPosition(uint128 sharesA, uint128 sharesB) external {
        // En un caso real: llama a amm.addLiquidity y luego guarda.
        // Aquí simulamos cómo lo guardamos eficientemente.
        Position memory cur = userPositions[msg.sender];
        userPositions[msg.sender] = Position(cur.sharesTkna + sharesA, cur.sharesTknb + sharesB);
    }

    /**
     * @dev Lectura estándar de Solidity (múltiples SLOAD, decodificación estándar)
     */
    function getStandardPosition(address user) external view returns (uint128 sharesA, uint128 sharesB) {
        Position memory pos = userPositions[user];
        return (pos.sharesTkna, pos.sharesTknb);
    }

    /**
     * @dev Lectura óptica optimizada con Assembly directo 
     * En lugar de cargar la estructura a memory y luego devolver variables iteradas, 
     * lo recupera de la ranura de memoria y extrae los bits. Esto simula el ahorro 
     * esperado en operaciones cross-contract estilo extsload.
     */
    function getOptimizedPosition(address user) external view returns (uint128 sharesA, uint128 sharesB) {
        // Obtenemos el slot base mapping(address => Position) de `userPositions` que es el slot 0
        // ya que la variable `amm` es immutable y no ocupa storage slot.
        uint256 mappingSlot = 0;
        uint256 positionData;

        assembly {
            // Calcular keccak256(abi.encode(user, mappingSlot))
            mstore(0x00, user)
            mstore(0x20, mappingSlot)
            
            // ranura de memoria
            let posSlot := keccak256(0x00, 0x40)
            
            // Carga de disco dura (sload -> 1 acceso x 2 datos)
            positionData := sload(posSlot)
        }

        // Recuperar los datos a través de bitwise
        // sharesTkna está en los menores 128 bits
        sharesA = uint128(positionData);
        // sharesTknb está en los mayores 128 bits, así que desplazamos bit a la derecha
        sharesB = uint128(positionData >> 128);
    }
}
