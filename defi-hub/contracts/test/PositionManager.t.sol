// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {PositionManager} from "../src/PositionManager.sol";

contract PositionManagerTest is Test {
    PositionManager pm;
    address dummyUser = address(42);

    function setUp() public {
        // En una prueba real le pasamos el AMM vivo. Aquí la dirección 0 basta.
        pm = new PositionManager(address(0));
    }

    function testDeposit() public {
        vm.prank(dummyUser);
        pm.depositPosition(500, 1000);

        (uint128 a, uint128 b) = pm.getStandardPosition(dummyUser);
        assertEq(a, 500);
        assertEq(b, 1000);
    }

    function testOptimizedAssemblyReadMatchesStandard() public {
        vm.startPrank(dummyUser);
        pm.depositPosition(3456, 7890);
        vm.stopPrank();

        (uint128 stdA, uint128 stdB) = pm.getStandardPosition(dummyUser);
        (uint128 optA, uint128 optB) = pm.getOptimizedPosition(dummyUser);

        assertEq(stdA, optA, "Mismatch en shareA");
        assertEq(stdB, optB, "Mismatch en shareB");
    }

    // Benchmark para comparar uso de gas de la funcion standard
    function testGasStandardRead() public {
        vm.prank(dummyUser);
        pm.depositPosition(500, 1000);

        uint256 gasStart = gasleft();
        pm.getStandardPosition(dummyUser);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas usado para lectura Normal:", gasUsed);
    }

    // Benchmark para comparar uso de gas de la funcion assembly
    function testGasOptimizedRead() public {
        vm.prank(dummyUser);
        pm.depositPosition(500, 1000);

        uint256 gasStart = gasleft();
        pm.getOptimizedPosition(dummyUser);
        uint256 gasUsed = gasStart - gasleft();

        console.log("Gas usado para lectura Optimizada (Assembly):", gasUsed);
        // Debe ser consistente o levemente mejor que memory instantiation en un entorno complejo
    }
}
