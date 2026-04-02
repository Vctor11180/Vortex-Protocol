// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AMM} from "../src/AMM.sol";
import {PointsHook} from "../src/PointsHook.sol";
import {DynamicFeeHook} from "../src/DynamicFeeHook.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployFixScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        vm.startBroadcast(deployerPrivateKey);

        // Existen desde el despliegue original
        address token0 = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        address token1 = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
        PointsHook hook = PointsHook(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        DynamicFeeHook dynamicFeeHook = DynamicFeeHook(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9);

        // 1. Desplegar nuevo AMM con el fix de proporciones
        // Nota: En la versión modular, el AMM depende del Registry. 
        // Para este script de 'fix' rápido, creamos un registro temporal o usamos uno existente.
        // Aquí pasamos un placeholder address(0) solo para permitir la compilación si no se usa.
        AMM newAmm = new AMM(token0, token1, address(0)); 
        console.log("New AMM Contract Address:", address(newAmm));

        // 2. Configurar Hooks para que reconozcan al NUEVO AMM
        hook.setAmmAddress(address(newAmm));
        dynamicFeeHook.setAmmAddress(address(newAmm));

        // 3. Desplegar el PositionManager que faltaba
        PositionManager posManager = new PositionManager(address(newAmm));
        console.log("New PositionManager Address:", address(posManager));

        // 4. Inyectar liquidez inicial para que no divida por cero
        MockERC20(token0).approve(address(newAmm), 10000 ether);
        MockERC20(token1).approve(address(newAmm), 10000 ether);
        newAmm.addLiquidity(10000 ether, 10000 ether);
        console.log("Liquidez inicial anadida al nuevo AMM.");

        vm.stopBroadcast();
    }
}
