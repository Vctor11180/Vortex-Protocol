// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {AMM} from "../src/AMM.sol";
import {PointsHook} from "../src/PointsHook.sol";
import {DynamicFeeHook} from "../src/DynamicFeeHook.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        // Obtenemos la llave privada (por defecto la cuenta 0 de anvil si no hay .env)
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Desplegar tokens
        MockERC20 token0 = new MockERC20("Token A", "TKNA");
        MockERC20 token1 = new MockERC20("Token B", "TKNB");

        // 2. Desplegar Hooks
        PointsHook hook = new PointsHook();
        DynamicFeeHook dynamicFeeHook = new DynamicFeeHook();

        // 3. Desplegar AMM
        AMM amm = new AMM(address(token0), address(token1), address(hook), address(dynamicFeeHook));

        // 4. Configurar Hooks para que reconozcan al AMM
        hook.setAmmAddress(address(amm));
        dynamicFeeHook.setAmmAddress(address(amm));

        console.log("=== DEPLOYMENT COMPLETO ===");
        console.log("Token0 (TKNA) Address:", address(token0));
        console.log("Token1 (TKNB) Address:", address(token1));
        console.log("PointsHook (ERC1155) Address:", address(hook));
        console.log("AMM Contract Address:", address(amm));

        // 5. Acuñar algo de liquidez inicial al deployer para pruebas
        address deployer = vm.addr(deployerPrivateKey);
        token0.mint(deployer, 1000000 ether);
        token1.mint(deployer, 1000000 ether);
        
        // El deployer aprueba y añade la liquidez inicial al AMM (10,000 de cada uno)
        token0.approve(address(amm), 10000 ether);
        token1.approve(address(amm), 10000 ether);
        amm.addLiquidity(10000 ether, 10000 ether);
        
        console.log("Liquidez inicial anadida: 10,000 TKNA y 10,000 TKNB");

        vm.stopBroadcast();
    }
}
