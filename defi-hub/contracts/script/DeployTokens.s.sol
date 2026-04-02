// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        MockERC20 tokenA = new MockERC20("Token A", "TKNA");
        console.log("Token A deployed at:", address(tokenA));

        MockERC20 tokenB = new MockERC20("Token B", "TKNB");
        console.log("Token B deployed at:", address(tokenB));

        vm.stopBroadcast();
    }
}
