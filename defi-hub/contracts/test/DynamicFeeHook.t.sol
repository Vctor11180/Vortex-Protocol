// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {DynamicFeeHook} from "../src/DynamicFeeHook.sol";

contract DynamicFeeHookTest is Test {
    DynamicFeeHook hook;
    address mockAmm = address(123);

    function setUp() public {
        hook = new DynamicFeeHook();
        hook.setAmmAddress(mockAmm);
    }

    function testInitialFee() public {
        assertEq(hook.getDynamicFee(), hook.BASE_FEE());
    }

    function testFeeIncreaseOnVolume() public {
        // AMM simulates a swap
        vm.prank(mockAmm);
        hook.modifyFeeBeforeSwap(5000 * 10**18); // 5000 volume
        
        // BASE_FEE (30) + ((5000 * (100 - 30)) / 10000) = 30 + 35 = 65
        assertEq(hook.getDynamicFee(), 65);
    }

    function testMaxFeeThreshold() public {
        vm.prank(mockAmm);
        hook.modifyFeeBeforeSwap(20000 * 10**18); // Way above 10,000 threshold
        
        assertEq(hook.getDynamicFee(), hook.MAX_FEE());
    }

    function testVolumeDecay() public {
        vm.prank(mockAmm);
        hook.modifyFeeBeforeSwap(10000 * 10**18); // Max fee instantly at threshold
        assertEq(hook.getDynamicFee(), hook.MAX_FEE());

        // Fast forward 30 mins (half of window)
        vm.warp(block.timestamp + 1800);
        
        // Fee should have dropped halfway since volume decayed 50%
        // decayedVolume = 5000 -> fee = 65
        assertEq(hook.getDynamicFee(), 65);

        // Fast forward past 1 hour window
        vm.warp(block.timestamp + 3600);
        
        assertEq(hook.getDynamicFee(), hook.BASE_FEE());
    }

    // Fuzz Testing: Test random volumes and check if fee respects invariants
    function testFuzzFeeBounds(uint256 randomVolume) public {
        // Restringir fuzzing a valores razonables (0 a 100,000,000 ether)
        vm.assume(randomVolume <= 100_000_000 * 10**18);

        vm.prank(mockAmm);
        hook.modifyFeeBeforeSwap(randomVolume);

        uint256 currentFee = hook.getDynamicFee();
        assertGe(currentFee, hook.BASE_FEE());
        assertLe(currentFee, hook.MAX_FEE());
    }
}
