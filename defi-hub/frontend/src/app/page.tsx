'use client'

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, usePublicClient } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useState, useEffect, useMemo } from 'react'

const DYNAMIC_FEE_HOOK_ABI = [
  {
    "type": "function",
    "name": "getDynamicFee",
    "inputs": [],
    "outputs": [{ "name": "fee", "type": "uint256" }],
    "stateMutability": "view"
  }
]

const POINTS_HOOK_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      { "name": "account", "type": "address" },
      { "name": "id", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
]

// Asegurarse de tener importado el ABI correcto
const HOOK_ADDRESS = process.env.NEXT_PUBLIC_DYNAMIC_HOOK_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
const POSITION_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_POSITION_MANAGER || "0x0b306bf915c4d645ff596e518faf3f9669b97016" // Placeholder for Position Manager / Points Hook

const POSITION_MANAGER_ABI = [
  {
    "type": "function",
    "name": "getOptimizedPosition",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "sharesA", "type": "uint128" }, { "name": "sharesB", "type": "uint128" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      { "name": "sharesA", "type": "uint128" },
      { "name": "sharesB", "type": "uint128" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
]

const TOKEN0_ADDRESS = process.env.NEXT_PUBLIC_TOKEN0_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const TOKEN1_ADDRESS = process.env.NEXT_PUBLIC_TOKEN1_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS || "0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0"

const AMM_ABI = [
  {
    "type": "function",
    "name": "swap",
    "inputs": [
      { "name": "_tokenIn", "type": "address" },
      { "name": "_amountIn", "type": "uint256" }
    ],
    "outputs": [{ "name": "amountOut", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "addLiquidity",
    "inputs": [
      { "name": "_amount0", "type": "uint256" },
      { "name": "_amount1", "type": "uint256" }
    ],
    "outputs": [{ "name": "shares", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reserve0",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "reserve1",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
]

const ERC20_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }],
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "faucet",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable"
  }
]

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  // Consultar la comisión (fee dinámico actual base 10000)
  const { data: currentFeeBps } = useReadContract({
    address: HOOK_ADDRESS as `0x${string}`,
    abi: DYNAMIC_FEE_HOOK_ABI,
    functionName: 'getDynamicFee',
  })

  // Consultar la Posición Optimizada del Usuario
  const { data: userPositionData } = useReadContract({
    address: POSITION_MANAGER_ADDRESS as `0x${string}`,
    abi: POSITION_MANAGER_ABI,
    functionName: 'getOptimizedPosition',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  // Convertir fee (ej. 30 -> 0.3%)
  const feePercentage = (Number(currentFeeBps ?? 30) / 100).toFixed(2);

  // Extraer valores de posiciones si existen (es un arreglo `[sharesA, sharesB]`)
  const sharesA = userPositionData ? (userPositionData as readonly unknown[])[0]?.toString() : "0";
  const sharesB = userPositionData ? (userPositionData as readonly unknown[])[1]?.toString() : "0";

  const publicClient = usePublicClient()
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()
  const [isTxPending, setIsTxPending] = useState(false)
  const isPending = isWritePending || isTxPending

  // Balances
  const { data: balanceA, refetch: refetchA } = useReadContract({
    address: TOKEN0_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const { data: balanceB, refetch: refetchB } = useReadContract({
    address: TOKEN1_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  const handleFaucet = async (token: number) => {
    if (!publicClient) return;
    try {
      setIsTxPending(true);
      const hash = await writeContractAsync({
        address: (token === 0 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS) as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'faucet',
      });
      await publicClient.waitForTransactionReceipt({ hash });
      refetchA();
      refetchB();
    } catch (error) {
      console.error("Faucet failed:", error);
    } finally {
      setIsTxPending(false);
    }
  }

  const handleSwap = async () => {
    if (!amountIn || Number(amountIn) <= 0 || !publicClient) return;
    const amountInWei = parseUnits(amountIn, 18);

    try {
      setIsTxPending(true);

      // 1. Approve
      const approveHash = await writeContractAsync({
        address: tokenInAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AMM_ADDRESS, amountInWei]
      });
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      if (approveReceipt.status === 'reverted') throw new Error("Approve transaction reverted on-chain");

      // 2. Swap
      const swapHash = await writeContractAsync({
        address: AMM_ADDRESS as `0x${string}`,
        abi: AMM_ABI,
        functionName: 'swap',
        args: [tokenInAddress, amountInWei]
      });
      const swapReceipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
      if (swapReceipt.status === 'reverted') throw new Error("Swap transaction reverted on-chain");

      // 3. Success
      refetchAll();
      setAmountIn("");
    } catch (error) {
      console.error("Swap failed:", error);
      const msg = (error as { shortMessage?: string })?.shortMessage || (error as Error)?.message || "Transaction failed";
      alert("Swap Failed: \n" + msg);
    } finally {
      setIsTxPending(false);
    }
  }

  const [amountIn, setAmountIn] = useState("")
  const [isToken0ToToken1, setIsToken0ToToken1] = useState(true)
  const [liqAmount0, setLiqAmount0] = useState("")
  const [liqAmount1, setLiqAmount1] = useState("")

  // Variables dinámicas para el Swap
  const tokenInAddress = isToken0ToToken1 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS
  const symbolIn = isToken0ToToken1 ? "TKNA" : "TKNB"
  const symbolOut = isToken0ToToken1 ? "TKNB" : "TKNA"
  const userBalanceIn = isToken0ToToken1 ? balanceA : balanceB
  const isInsufficientBalance = Boolean(amountIn && userBalanceIn !== undefined && parseUnits(amountIn, 18) > (userBalanceIn as bigint));

  // Reservas del Pool
  const { data: reserve0, refetch: refetchR0 } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'reserve0',
  })

  const { data: reserve1, refetch: refetchR1 } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'reserve1',
  })

  // Balance de Puntos ERC-1155
  const { data: pointsBalance, refetch: refetchPoints } = useReadContract({
    address: HOOK_ADDRESS as `0x${string}`,
    abi: POINTS_HOOK_ABI,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(1)] : undefined,
    query: {
      enabled: !!address,
    }
  })

  // Recarga Global
  const refetchAll = () => {
    refetchA();
    refetchB();
    refetchR0();
    refetchR1();
    refetchPoints();
  }

  // --- NUEVA LÓGICA DE ESTIMACIÓN MATEMÁTICA LADO CLIENTE ---
  const expectedAmountOut = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0 || !reserve0 || !reserve1) return ""

    try {
      const amountInBig = parseUnits(amountIn, 18)
      const reserveIn = isToken0ToToken1 ? (reserve0 as bigint) : (reserve1 as bigint)
      const reserveOut = isToken0ToToken1 ? (reserve1 as bigint) : (reserve0 as bigint)

      const feeBps = BigInt(currentFeeBps ? currentFeeBps.toString() : "30")

      // amountInWithFee = (_amountIn * (10000 - feeBps)) / 10000;
      const amountInWithFee = (amountInBig * (BigInt(10000) - feeBps)) / BigInt(10000)

      // amountOut = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
      const amountOutBig = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)

      return Number(formatUnits(amountOutBig, 18)).toFixed(4)
    } catch {
      return ""
    }
  }, [amountIn, reserve0, reserve1, isToken0ToToken1, currentFeeBps])


  const handleLiqAmount0Change = (val: string) => {
    setLiqAmount0(val);
    if (!val || Number(val) <= 0 || !reserve0 || !reserve1 || (reserve0 as bigint) === BigInt(0)) {
      setLiqAmount1("");
      return;
    }
    try {
      const parsedVal = parseUnits(val, 18);
      const r0 = reserve0 as bigint;
      const r1 = reserve1 as bigint;
      const expectedR1 = (parsedVal * r1) / r0;
      setLiqAmount1(Number(formatUnits(expectedR1, 18)).toFixed(4));
    } catch {
      setLiqAmount1("");
    }
  };

  const handleLiqAmount1Change = (val: string) => {
    setLiqAmount1(val);
    if (!val || Number(val) <= 0 || !reserve0 || !reserve1 || (reserve1 as bigint) === BigInt(0)) {
      setLiqAmount0("");
      return;
    }
    try {
      const parsedVal = parseUnits(val, 18);
      const r0 = reserve0 as bigint;
      const r1 = reserve1 as bigint;
      const expectedR0 = (parsedVal * r0) / r1;
      setLiqAmount0(Number(formatUnits(expectedR0, 18)).toFixed(4));
    } catch {
      setLiqAmount0("");
    }
  };

  const handleAddLiquidity = async () => {
    if (!liqAmount0 || !liqAmount1 || Number(liqAmount0) <= 0 || Number(liqAmount1) <= 0 || !publicClient) return;
    const r0 = parseUnits(liqAmount0, 18);
    const r1 = parseUnits(liqAmount1, 18);

    try {
      setIsTxPending(true);

      // 1. Approve Token 0
      const approve0Hash = await writeContractAsync({
        address: TOKEN0_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AMM_ADDRESS, r0]
      });
      const approve0Receipt = await publicClient.waitForTransactionReceipt({ hash: approve0Hash });
      if (approve0Receipt.status === 'reverted') throw new Error("Token 0 Approve reverted on-chain");

      // 2. Approve Token 1
      const approve1Hash = await writeContractAsync({
        address: TOKEN1_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AMM_ADDRESS, r1]
      });
      const approve1Receipt = await publicClient.waitForTransactionReceipt({ hash: approve1Hash });
      if (approve1Receipt.status === 'reverted') throw new Error("Token 1 Approve reverted on-chain");

      // 3. Add Liquidity
      const addLiqHash = await writeContractAsync({
        address: AMM_ADDRESS as `0x${string}`,
        abi: AMM_ABI,
        functionName: 'addLiquidity',
        args: [r0, r1]
      });
      const addLiqReceipt = await publicClient.waitForTransactionReceipt({ hash: addLiqHash });
      if (addLiqReceipt.status === 'reverted') throw new Error("Add Liquidity reverted on-chain");

      // 4. Update Position Manager mock state to sync UI
      const depositPosHash = await writeContractAsync({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: [{
          "type": "function",
          "name": "depositPosition",
          "inputs": [{ "name": "sharesA", "type": "uint128" }, { "name": "sharesB", "type": "uint128" }],
          "outputs": [],
          "stateMutability": "nonpayable"
        }],
        functionName: 'depositPosition',
        args: [r0 / BigInt(1e18), r1 / BigInt(1e18)]
      });
      const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositPosHash });
      if (depositReceipt.status === 'reverted') throw new Error("Position Manager Sync reverted on-chain");

      // 5. Success
      refetchAll();
      setLiqAmount0("");
      setLiqAmount1("");
    } catch (error) {
      console.error("Add Liquidity failed:", error);
    } finally {
      setIsTxPending(false);
    }
  }

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 bg-[#0a0f1c] relative overflow-hidden font-sans selection:bg-indigo-500/30">

      {/* Modern Glassmorphism Background Orbs */}
      <div className="absolute top-[-15%] -left-[10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[160px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-5 z-10 border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-md px-6 sm:px-8 rounded-3xl mt-2 sticky top-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-xl">🌪️</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-violet-300 hidden sm:block">
            Vortex
          </h1>
        </div>

        <div className="flex gap-4 items-center">
          {isConnected ? (
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
              <div className="hidden sm:flex items-center bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                <button
                  onClick={() => handleFaucet(0)}
                  disabled={isPending}
                  className="px-4 py-2 text-indigo-300 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-200 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-out active:scale-95"
                >
                  + TKNA
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                <button
                  onClick={() => handleFaucet(1)}
                  disabled={isPending}
                  className="px-4 py-2 text-cyan-300 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-200 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-out active:scale-95 mr-1"
                >
                  + TKNB
                </button>
              </div>

              <div className="px-4 py-2.5 bg-gradient-to-r from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 rounded-2xl text-white font-medium tracking-wide text-sm flex items-center gap-2 sm:gap-3 shadow-lg transition-all cursor-default group">
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                <span className="font-mono text-gray-300 group-hover:text-white transition-colors">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-10 h-10 rounded-2xl border border-white/5 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-gray-400 transition-all duration-300 shrink-0"
                title="Disconnect"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          ) : (
            <div className="flex gap-2 sm:gap-3">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-black hover:bg-indigo-50 border border-transparent rounded-2xl transition-all duration-300 font-bold text-sm shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Connect Wallet
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 mt-6">

        {/* Position Manager Dashboard */}
        <div className="lg:col-span-12 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="relative bg-white/[0.02] border border-white/10 p-6 sm:p-8 rounded-[2rem] backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Decals */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full pointer-events-none hidden sm:block" />

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
              <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                <div className="p-2 bg-pink-500/20 rounded-xl text-pink-400 ring-1 ring-pink-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                </div>
                Yield Position Manager
              </h2>
              <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-2 self-start md:self-auto">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Bitwise Optimized
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative z-10">
              <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-purple-500/30 to-white/5 overflow-hidden group/card shadow-lg hover:shadow-purple-500/10 transition-shadow">
                <div className="absolute inset-0 bg-purple-500/5 group-hover/card:bg-purple-500/10 transition-colors" />
                <div className="bg-[#0a0f1c]/80 backdrop-blur-md p-6 rounded-[23px] flex items-center justify-between h-full relative z-10">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-purple-200/60 mb-2 tracking-wide uppercase">TKNA Liquidity Pool</p>
                    <p className="text-3xl sm:text-4xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-indigo-400 tracking-tight">
                      {isConnected ? sharesA : "0"} <span className="text-sm sm:text-lg text-purple-500/50">Shares</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                  </div>
                </div>
              </div>

              <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-cyan-500/30 to-white/5 overflow-hidden group/card shadow-lg hover:shadow-cyan-500/10 transition-shadow">
                <div className="absolute inset-0 bg-cyan-500/5 group-hover/card:bg-cyan-500/10 transition-colors" />
                <div className="bg-[#0a0f1c]/80 backdrop-blur-md p-6 rounded-[23px] flex items-center justify-between h-full relative z-10">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-cyan-200/60 mb-2 tracking-wide uppercase">TKNB Liquidity Pool</p>
                    <p className="text-3xl sm:text-4xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 tracking-tight">
                      {isConnected ? sharesB : "0"} <span className="text-sm sm:text-lg text-cyan-500/50">Shares</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-2 bg-black/20 px-4 py-2 rounded-full border border-white/5 text-center px-4 py-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Lectura de un solo slot utilizando Yul. Cero dependencias externas.
              </p>
            </div>
          </div>
        </div>

        {/* SWAP WIDGET */}
        <div className="lg:col-span-8 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] blur-md opacity-20"></div>
          <div className="relative bg-[#0d1326]/90 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-3xl shadow-2xl min-h-[500px] flex flex-col z-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Swap
              </h2>
              <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/[0.05]">
                <div className={`w-2 h-2 rounded-full ${feePercentage === "0.30" ? "bg-indigo-400" : "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"}`} />
                <span className="text-xs sm:text-sm font-medium text-gray-300">
                  Fee: <span className={feePercentage === "0.30" ? "text-white" : "text-amber-400"}>{feePercentage}%</span>
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-2 relative">
              {/* Input Box 1 */}
              <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-white/5 overflow-hidden transition-all duration-300 focus-within:from-indigo-500/50 focus-within:to-white/10 group shadow-inner bg-black/20">
                <div className="bg-[#0f162c] p-5 rounded-[23px] relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-400 group-focus-within:text-indigo-300 transition-colors">You Pay</p>
                    <p className="text-xs font-medium text-gray-500">
                      Balance: <span className="text-gray-300 font-mono">{userBalanceIn ? Number(formatUnits(userBalanceIn as bigint, 18)).toFixed(4) : "0.00"}</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <input
                      type="number"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      placeholder="0"
                      className="bg-transparent text-3xl sm:text-4xl text-white outline-none w-[50%] sm:w-[60%] font-semibold placeholder-gray-600 truncate"
                    />
                    <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 active:bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-white/10 transition-all shadow-md group/btn cursor-default shrink-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-inner ${isToken0ToToken1 ? 'bg-gradient-to-br from-indigo-400 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`} />
                      <span className="font-bold text-white group-hover/btn:text-white text-sm sm:text-base">{symbolIn}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Swap Switch Arrow */}
              <div className="absolute left-[50%] -translate-x-1/2 top-[50%] -translate-y-1/2 z-20">
                <button
                  onClick={() => setIsToken0ToToken1(!isToken0ToToken1)}
                  className="p-3 bg-[#131b31] border-4 border-[#0d1326] rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all shadow-xl hover:-translate-y-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
                </button>
              </div>

              {/* Input Box 2 (Output) */}
              <div className="relative p-[1px] rounded-3xl bg-white/5 overflow-hidden shadow-inner bg-black/20 mt-2">
                <div className="bg-[#0f162c] p-5 rounded-[23px] relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-gray-400">You Receive</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={expectedAmountOut}
                      placeholder="0"
                      className="bg-transparent text-3xl sm:text-4xl text-gray-300 outline-none w-[50%] sm:w-[60%] font-semibold placeholder-gray-700 pointer-events-none truncate"
                      readOnly
                    />
                    <button className="flex items-center gap-2 bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-white/10 cursor-default opacity-80 shrink-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-inner ${!isToken0ToToken1 ? 'bg-gradient-to-br from-indigo-400 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`} />
                      <span className="font-bold text-white text-sm sm:text-base">{symbolOut}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={isPending || !amountIn || Number(amountIn) <= 0 || !isConnected || isInsufficientBalance}
              className="w-full mt-8 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed rounded-[1.5rem]"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${isPending ? 'from-indigo-600 to-purple-600' : 'from-indigo-500 via-purple-500 to-pink-500'} transition-all duration-300`} />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative py-4 sm:py-4.5 px-6 flex items-center justify-center font-bold text-base sm:text-lg text-white tracking-wide shadow-2xl h-14 sm:h-16">
                {isPending ? (
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Confirm in Wallet...
                  </div>
                ) : !isConnected ? (
                  "Connect Wallet to Swap"
                ) : isInsufficientBalance ? (
                  `Insufficient ${symbolIn} Balance`
                ) : !amountIn || Number(amountIn) <= 0 ? (
                  "Enter an amount"
                ) : (
                  "Swap Tokens"
                )}
              </div>
            </button>
          </div>
        </div>

        {/* SIDE PANELS */}
        <div className="lg:col-span-4 flex flex-col gap-8">

          {/* POINTS / REWARDS PANEL */}
          <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-amber-400/40 via-orange-500/20 to-transparent group overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/20 blur-[50px] group-hover:bg-amber-500/30 transition-colors" />
            <div className="bg-[#0f162c]/90 backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-7 relative z-10 border border-white/5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                    <span className="text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">🏆</span> Reward Points
                  </h3>
                  <p className="text-[10px] sm:text-xs font-medium text-amber-500/70">ERC-1155 LOYALTY HOOK</p>
                </div>
              </div>

              <div className="flex items-end gap-3 my-4 sm:my-6">
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-amber-200 drop-shadow-sm truncate">
                  {isConnected ? (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)).toFixed(2) : "0.00") : "0.00"}
                </span>
                <span className="text-lg sm:text-xl font-bold text-amber-500 mb-1 sm:mb-2">PTS</span>
              </div>

              <div className="w-full bg-black/40 h-3 rounded-full overflow-hidden shadow-inner border border-white/5">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 h-full w-[65%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </div>
              </div>

              <div className="mt-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                </div>
                <p className="text-[10px] sm:text-xs text-amber-200/70 leading-relaxed">
                  Ganarás <strong className="text-amber-400">1 PTS</strong> mágicamente gracias al Hook por cada Swap exitoso.
                </p>
              </div>
            </div>
          </div>

          {/* LIQUIDITY PANEL */}
          <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-emerald-500/10">
            <div className="bg-[#0f162c]/90 backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-7 border border-white/5">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <span className="text-blue-400">💧</span> Protocol Liquidity
              </h3>

              <div className="space-y-3 mb-6">
                <div className="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 flex justify-between items-center sm:flex-col sm:items-start sm:gap-1 shadow-inner">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">TKNA Reserve</span>
                  <span className="font-mono text-base sm:text-xl font-bold text-white">{reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toFixed(2) : "0.00"}</span>
                </div>
                <div className="bg-black/30 p-3 sm:p-4 rounded-2xl border border-white/5 flex justify-between items-center sm:flex-col sm:items-start sm:gap-1 shadow-inner">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">TKNB Reserve</span>
                  <span className="font-mono text-base sm:text-xl font-bold text-white">{reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toFixed(2) : "0.00"}</span>
                </div>
              </div>

              <div className="pt-5 sm:pt-6 border-t border-white/10">
                <p className="text-[10px] sm:text-xs font-medium text-gray-400 mb-3 ml-1 uppercase">Add Liquidity</p>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <input
                    type="number"
                    value={liqAmount0}
                    onChange={(e) => handleLiqAmount0Change(e.target.value)}
                    placeholder="TKNA"
                    className="w-full sm:w-1/2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-colors placeholder-gray-600 font-mono"
                  />
                  <input
                    type="number"
                    value={liqAmount1}
                    onChange={(e) => handleLiqAmount1Change(e.target.value)}
                    placeholder="TKNB"
                    className="w-full sm:w-1/2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-colors placeholder-gray-600 font-mono"
                  />
                </div>
                <button
                  onClick={handleAddLiquidity}
                  disabled={isPending || !liqAmount0 || !liqAmount1 || !isConnected}
                  className="w-full py-3 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-300 disabled:opacity-50 disabled:hover:bg-white/5 disabled:text-gray-500 border border-white/10 hover:border-emerald-500/50 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                >
                  {isPending ? "Executing..." : "Provide Liquidity"}
                </button>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
