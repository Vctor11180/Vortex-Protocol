// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {AMM} from "../src/AMM.sol";
import {PointsHook} from "../src/PointsHook.sol";
import {DynamicFeeHook} from "../src/DynamicFeeHook.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";

contract AMMTest is Test {
    AMM amm;
    PointsHook pointsHook;
    DynamicFeeHook dynamicFeeHook;
    MockERC20 token0;
    MockERC20 token1;

    address user1 = address(1);
    address user2 = address(2);

    function setUp() public {
        token0 = new MockERC20("Token A", "TKNA");
        token1 = new MockERC20("Token B", "TKNB");

        pointsHook = new PointsHook();
        dynamicFeeHook = new DynamicFeeHook();

        amm = new AMM(address(token0), address(token1), address(pointsHook), address(dynamicFeeHook));

        pointsHook.setAmmAddress(address(amm));
        dynamicFeeHook.setAmmAddress(address(amm));

        // Mint initial tokens to users
        token0.mint(user1, 10000 ether);
        token1.mint(user1, 10000 ether);

        token0.mint(user2, 5000 ether);
        token1.mint(user2, 5000 ether);
    }

    function testAddLiquidity() public {
        vm.startPrank(user1);
        token0.approve(address(amm), 1000 ether);
        token1.approve(address(amm), 1000 ether);

        uint256 shares = amm.addLiquidity(1000 ether, 1000 ether);
        vm.stopPrank();

        assertEq(shares, 1000 ether);
        assertEq(amm.reserve0(), 1000 ether);
        assertEq(amm.reserve1(), 1000 ether);
    }

    function testSwapAndPointsHook() public {
        // user1 adds liquidity
        vm.startPrank(user1);
        token0.approve(address(amm), 1000 ether);
        token1.approve(address(amm), 1000 ether);
        amm.addLiquidity(1000 ether, 1000 ether);
        vm.stopPrank();

        // user2 swaps
        vm.startPrank(user2);
        token0.approve(address(amm), 100 ether);
        
        // Expected out: (1000 * (100 * 0.997)) / (1000 + (100 * 0.997))
        // 1000 * 99.7 / 1099.7 = ~90.66
        amm.swap(address(token0), 100 ether);
        
        assertGt(token1.balanceOf(user2), 5000 ether); // Received Token1

        // Check if Points were minted via Hook
        // 100 ether swapped / 100 = 1 ether POINTS
        uint256 expectedPoints = (100 ether * 1) / 100;
        assertEq(pointsHook.balanceOf(user2, pointsHook.POINT_ID()), expectedPoints);

        vm.stopPrank();
    }
}
