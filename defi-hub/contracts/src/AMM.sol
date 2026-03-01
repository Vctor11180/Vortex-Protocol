// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {PointsHook} from "./PointsHook.sol";
import {DynamicFeeHook} from "./DynamicFeeHook.sol";

contract AMM {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    PointsHook public immutable pointsHook;
    DynamicFeeHook public immutable dynamicFeeHook;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;

    constructor(
        address _token0, 
        address _token1, 
        address _pointsHook,
        address _dynamicFeeHook
    ) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        pointsHook = PointsHook(_pointsHook);
        dynamicFeeHook = DynamicFeeHook(_dynamicFeeHook);
    }

    function _mint(address _to, uint256 _amount) private {
        balanceOf[_to] += _amount;
        totalSupply += _amount;
    }

    function _burn(address _from, uint256 _amount) private {
        balanceOf[_from] -= _amount;
        totalSupply -= _amount;
    }

    function _update(uint256 _reserve0, uint256 _reserve1) private {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }

    function addLiquidity(uint256 _amount0, uint256 _amount1) external returns (uint256 shares) {
        token0.safeTransferFrom(msg.sender, address(this), _amount0);
        token1.safeTransferFrom(msg.sender, address(this), _amount1);

        if (reserve0 > 0 || reserve1 > 0) {
            require(reserve0 * _amount1 == reserve1 * _amount0, "Invalid proportion");
        }

        if (totalSupply == 0) {
            shares = _sqrt(_amount0 * _amount1);
        } else {
            shares = _min(
                (_amount0 * totalSupply) / reserve0,
                (_amount1 * totalSupply) / reserve1
            );
        }

        require(shares > 0, "Shares = 0");
        _mint(msg.sender, shares);
        _update(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
    }

    function removeLiquidity(uint256 _shares) external returns (uint256 amount0, uint256 amount1) {
        amount0 = (_shares * reserve0) / totalSupply;
        amount1 = (_shares * reserve1) / totalSupply;
        require(amount0 > 0 && amount1 > 0, "Amount = 0");

        _burn(msg.sender, _shares);
        _update(reserve0 - amount0, reserve1 - amount1);

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);
    }

    function swap(address _tokenIn, uint256 _amountIn) external returns (uint256 amountOut) {
        require(_tokenIn == address(token0) || _tokenIn == address(token1), "Invalid token");
        require(_amountIn > 0, "Amount In = 0");

        bool isToken0 = _tokenIn == address(token0);
        (IERC20 tokenIn, IERC20 tokenOut, uint256 reserveIn, uint256 reserveOut) = isToken0
            ? (token0, token1, reserve0, reserve1)
            : (token1, token0, reserve1, reserve0);

        tokenIn.safeTransferFrom(msg.sender, address(this), _amountIn);

        // Before Swap Hook Call for Dynamic Fee
        uint256 feeBps = 30; // Base fee 0.3%
        if (address(dynamicFeeHook) != address(0)) {
            feeBps = dynamicFeeHook.modifyFeeBeforeSwap(_amountIn);
        }

        // Apply dynamic fee based on 10,000 basis points
        uint256 amountInWithFee = (_amountIn * (10000 - feeBps)) / 10000;
        amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);

        tokenOut.safeTransfer(msg.sender, amountOut);
        _update(token0.balanceOf(address(this)), token1.balanceOf(address(this)));

        // After Swap Hook Call
        if (address(pointsHook) != address(0)) {
            pointsHook.afterSwap(msg.sender, _amountIn);
        }
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}
