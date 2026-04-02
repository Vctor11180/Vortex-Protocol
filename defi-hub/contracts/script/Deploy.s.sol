// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AMM} from "../src/AMM.sol";
import {PointsHook} from "../src/PointsHook.sol";
import {DynamicFeeHook} from "../src/DynamicFeeHook.sol";
import {HookRegistry} from "../src/HookRegistry.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        // Obtenemos la llave privada (por defecto la cuenta 0 de anvil si no hay .env)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Desplegar tokens
        MockERC20 token0 = new MockERC20("Token A", "TKNA");
        MockERC20 token1 = new MockERC20("Token B", "TKNB");

        // 2. Desplegar Infraestructura Modular (Registry)
        HookRegistry registry = new HookRegistry();

        // 3. Desplegar Hooks
        PointsHook hook = new PointsHook();
        DynamicFeeHook dynamicFeeHook = new DynamicFeeHook();

        // 4. Registrar Hooks en el Registry
        registry.updatePointsHook(address(hook));
        registry.updateDynamicFeeHook(address(dynamicFeeHook));

        // 5. Desplegar AMM (ahora solo depende del Registry)
        AMM amm = new AMM(address(token0), address(token1), address(registry));

        // 6. Configurar Hooks para que reconozcan al AMM y se reconozcan entre ellos
        hook.setAmmAddress(address(amm));
        dynamicFeeHook.setAmmAddress(address(amm));
        hook.setDynamicFeeHook(address(dynamicFeeHook));

        console.log("=== DEPLOYMENT COMPLETO (MODULAR) ===");
        console.log("Token0 (TKNA) Address:", address(token0));
        console.log("Token1 (TKNB) Address:", address(token1));
        console.log("HookRegistry Address:", address(registry));
        console.log("PointsHook Address:", address(hook));
        console.log("DynamicFeeHook Address:", address(dynamicFeeHook));
        console.log("AMM Contract Address:", address(amm));

        // 7. Acuñar algo de liquidez inicial al deployer de protocolo
        address protocolProvider = vm.addr(deployerPrivateKey);
        
        token0.mint(protocolProvider, 1000000 ether);
        token1.mint(protocolProvider, 1000000 ether);
        
        token0.approve(address(amm), 10000 ether);
        token1.approve(address(amm), 10000 ether);
        amm.addLiquidity(10000 ether, 10000 ether);
        
        console.log("Liquidez inicial anadida por el Protocol Provider (Deployer)");

        vm.stopBroadcast();
    }
}

