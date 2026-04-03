'use client'

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, usePublicClient, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { sepolia } from 'wagmi/chains'
import { useState, useEffect, useMemo } from 'react'
import { EVMMentor } from '../../components/EVMMentor'

const REGISTRY_ABI = [
  {
    "type": "function",
    "name": "getHooks",
    "inputs": [],
    "outputs": [
      { "name": "_pointsHook", "type": "address" },
      { "name": "_dynamicFeeHook", "type": "address" }
    ],
    "stateMutability": "view"
  }
]

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
  },
  {
    "type": "function",
    "name": "redeem",
    "inputs": [
      { "name": "rewardId", "type": "uint256" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
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
const HOOK_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_HOOK_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3" // Placeholder - Update after deploy
const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
const POINTS_HOOK_ADDRESS = process.env.NEXT_PUBLIC_POINTS_HOOK_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
const DYNAMIC_FEE_HOOK_ADDRESS = process.env.NEXT_PUBLIC_DYNAMIC_HOOK_ADDRESS || "0x0165878A594ca25D0088918991418a1039643171"

const ERC1155_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "account", "type": "address" }, { "name": "id", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
]

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
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{ "name": "", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
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
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const isWrongNetwork = isConnected && chainId !== sepolia.id
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mentorSection, setMentorSection] = useState<'swap' | 'liquidity' | 'rewards' | 'available-rewards' | 'protocol-reserves' | 'tkna' | 'tknb' | 'none'>('none')

  // Inicializar tema y aplicar cambios
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('vortex-theme') as 'light' | 'dark' || 'dark'
    setTheme(savedTheme)
    
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('vortex-theme', nextTheme)
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Consultar la comisión (fee dinámico actual base 10000)
  const { data: currentFeeBps, refetch: refetchFee } = useReadContract({
    address: HOOK_ADDRESS as `0x${string}`,
    abi: DYNAMIC_FEE_HOOK_ABI,
    functionName: 'getDynamicFee',
    query: {
      enabled: !!address,
    }
  });

  // --- LIQUIDEZ PERSONAL (LP SHARES) ---
  // Movido arriba para evitar errores de declaración
  const refetchPosition = () => {
    refetchLP();
    refetchTotalSupply();
  };

  // Balance de Puntos
  const { data: pointsBalance, refetch: refetchPoints } = useReadContract({
    address: POINTS_HOOK_ADDRESS as `0x${string}`,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(1)] : undefined,
    query: {
      enabled: !!address,
    }
  });

  // Convertir fee (ej. 30 -> 0.3%)
  const feePercentage = (Number(currentFeeBps ?? 30) / 100).toFixed(2);

  // --- CÁLCULO DE MONTOS PERSONALES ---
  // Movido arriba para evitar errores de declaración

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

  // --- RESERVAS Y LIQUIDEZ ---
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

  const { data: lpBalance, refetch: refetchLP } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'totalSupply',
  });

  // --- CÁLCULO DE MONTOS PERSONALES ---
  const userAmount0 = useMemo(() => {
    if (!lpBalance || !totalSupply || !reserve0 || (totalSupply as bigint) === BigInt(0)) return "0.00";
    const amount = ((lpBalance as bigint) * (reserve0 as bigint)) / (totalSupply as bigint);
    return Number(formatUnits(amount, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }, [lpBalance, totalSupply, reserve0]);

  const userAmount1 = useMemo(() => {
    if (!lpBalance || !totalSupply || !reserve1 || (totalSupply as bigint) === BigInt(0)) return "0.00";
    const amount = ((lpBalance as bigint) * (reserve1 as bigint)) / (totalSupply as bigint);
    return Number(formatUnits(amount, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }, [lpBalance, totalSupply, reserve1]);

  const userSharesFormatted = useMemo(() => {
    if (!lpBalance) return "0.00";
    return Number(formatUnits(lpBalance as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 });
  }, [lpBalance]);

  const handleFaucet = async (token: number) => {
    if (!publicClient) return;
    try {
      setIsTxPending(true);
      const hash = await writeContractAsync({
        address: (token === 0 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS) as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'faucet',
      });
      await publicClient.waitForTransactionReceipt({ 
        hash,
        retryCount: 10,
        pollingInterval: 4000 
      });
      refetchAll();
    } catch (error) {
      console.error("Faucet failed:", error);
    } finally {
      setIsTxPending(false);
    }
  }

  const handleRedeem = async (rewardId: number, amount: number) => {
    if (!publicClient || !address) return;
    try {
      setIsTxPending(true);
      const amountWei = parseUnits(amount.toString(), 18);
      const hash = await writeContractAsync({
        address: POINTS_HOOK_ADDRESS as `0x${string}`,
        abi: POINTS_HOOK_ABI,
        functionName: 'redeem',
        args: [BigInt(rewardId), amountWei],
      });
      await publicClient.waitForTransactionReceipt({ 
        hash,
        retryCount: 10,
        pollingInterval: 4000 
      });
      refetchAll();
      alert("¡Canje exitoso! Beneficio activado.");
    } catch (error) {
      console.error("Redeem failed:", error);
      alert("Error al canjear: " + (error as Error).message);
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
      // Esperar sin timeout corto para Sepolia
      const swapReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: swapHash,
        retryCount: 10,
        pollingInterval: 4000 
      });
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

  // Reservas del Pool (Movidas arriba)

  // Balance de Puntos ERC-1155
  // This block was moved and updated above.

  // Recarga Global
  const refetchAll = () => {
    refetchA();
    refetchB();
    refetchR0();
    refetchR1();
    refetchFee();
    refetchLP();
    refetchTotalSupply();
    refetchPoints();
  }

  // --- NUEVA LÓGICA DE ESTIMACIÓN MATEMÁTICA LADO CLIENTE ---
  const expectedAmountOut = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0 || !reserve0 || !reserve1 || (reserve0 as bigint) === BigInt(0) || (reserve1 as bigint) === BigInt(0)) return ""

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
    if (!val || Number(val) <= 0 || !reserve0 || !reserve1 || (reserve0 as bigint) === BigInt(0) || (reserve1 as bigint) === BigInt(0)) {
      if (!val) setLiqAmount1("");
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
    if (!val || Number(val) <= 0 || !reserve0 || !reserve1 || (reserve0 as bigint) === BigInt(0) || (reserve1 as bigint) === BigInt(0)) {
      if (!val) setLiqAmount0("");
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
      const approve0Receipt = await publicClient.waitForTransactionReceipt({ 
        hash: approve0Hash,
        retryCount: 10,
        pollingInterval: 4000 
      });
      if (approve0Receipt.status === 'reverted') throw new Error("Token 0 Approve reverted on-chain");

      // 2. Approve Token 1
      const approve1Hash = await writeContractAsync({
        address: TOKEN1_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AMM_ADDRESS, r1]
      });
      const approve1Receipt = await publicClient.waitForTransactionReceipt({ 
        hash: approve1Hash,
        retryCount: 10,
        pollingInterval: 4000 
      });
      if (approve1Receipt.status === 'reverted') throw new Error("Token 1 Approve reverted on-chain");

      // 3. Add Liquidity
      const addLiqHash = await writeContractAsync({
        address: AMM_ADDRESS as `0x${string}`,
        abi: AMM_ABI,
        functionName: 'addLiquidity',
        args: [r0, r1]
      });
      const addLiqReceipt = await publicClient.waitForTransactionReceipt({ 
        hash: addLiqHash,
        retryCount: 10,
        pollingInterval: 4000 
      });
      if (addLiqReceipt.status === 'reverted') throw new Error("Add Liquidity reverted on-chain");

      // 4. Success
      refetchAll();
      setLiqAmount0("");
      setLiqAmount1("");
    } catch (error) {
      console.error("Add Liquidity failed:", error);
      const msg = (error as { shortMessage?: string })?.shortMessage || (error as Error)?.message || "Transaction failed";
      alert("Add Liquidity Failed: \n" + msg);
    } finally {
      setIsTxPending(false);
    }
  }

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 bg-background text-foreground relative overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-500">

      {/* Modern Glassmorphism Background Orbs - Refinadas para estética oscura y premium */}
      <div className="absolute top-[-10%] -left-[5%] w-[600px] h-[600px] bg-indigo-500/30 dark:bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none mix-blend-normal dark:mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-fuchsia-500/20 dark:bg-purple-600/10 rounded-full blur-[160px] pointer-events-none mix-blend-normal dark:mix-blend-screen" />
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[800px] h-[300px] bg-cyan-400/20 dark:bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none mix-blend-normal dark:mix-blend-screen" />

      {/* Wrong Network Banner */}
      {isWrongNetwork && (
        <div className="w-full max-w-6xl z-20 mt-2">
          <div className="flex items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/40 rounded-2xl px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-orange-400 text-xl">⚠️</span>
              <p className="text-sm text-orange-200 font-medium">
                <strong>Red incorrecta.</strong> Estás en la red con chain ID <span className="font-mono bg-orange-500/20 px-1 rounded">{chainId}</span>. Esta app requiere la red <strong>Sepolia Testnet</strong> (chain ID 11155111).
              </p>
            </div>
            <button
              onClick={() => switchChain({ chainId: sepolia.id })}
              disabled={isSwitchingChain}
              className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-60"
            >
              {isSwitchingChain ? 'Cambiando...' : 'Cambiar a Sepolia'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-5 z-10 border-b border-v-border bg-v-card backdrop-blur-md px-6 sm:px-8 rounded-3xl mt-2 sticky top-4 shadow-xl shadow-slate-200/50 dark:shadow-black/20 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-xl">🌪️</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-600 to-violet-700 dark:from-white dark:via-indigo-200 dark:to-violet-300 hidden sm:block">
            Vortex
          </h1>
        </div>

        <div className="flex gap-4 items-center">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-2xl border border-v-border flex items-center justify-center bg-v-card hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 shadow-sm active:scale-90"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

          {isConnected ? (
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
              <div className="hidden sm:flex items-center bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                <button
                  onMouseEnter={() => setMentorSection('tkna')}
                  onMouseLeave={() => setMentorSection('none')}
                  onClick={() => handleFaucet(0)}
                  disabled={isPending}
                  className="px-4 py-2 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-200 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-out active:scale-95"
                >
                  + TKNA
                </button>
                <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-1"></div>
                <button
                  onMouseEnter={() => setMentorSection('tknb')}
                  onMouseLeave={() => setMentorSection('none')}
                  onClick={() => handleFaucet(1)}
                  disabled={isPending}
                  className="px-4 py-2 text-cyan-600 dark:text-cyan-300 rounded-xl hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-200 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ease-out active:scale-95 mr-1"
                >
                  + TKNB
                </button>
              </div>

              <div className="px-4 py-2.5 bg-white dark:bg-transparent dark:bg-gradient-to-r dark:from-white/5 dark:to-white/[0.02] hover:bg-slate-50 dark:hover:from-white/10 dark:hover:to-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium tracking-wide text-sm flex items-center gap-2 sm:gap-3 shadow-sm dark:shadow-lg transition-all cursor-default group">
                <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                <span className="font-mono text-slate-600 dark:text-gray-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <button
                onClick={() => disconnect()}
                className="w-10 h-10 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-center bg-white dark:bg-white/5 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/20 dark:hover:border-red-500/30 text-slate-400 dark:text-gray-400 transition-all duration-300 shrink-0 shadow-sm dark:shadow-none"
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
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 dark:bg-white text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-indigo-50 border border-transparent rounded-2xl transition-all duration-300 font-bold text-sm shadow-md dark:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-lg dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 whitespace-nowrap"
                >
                  Connect {connector.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 mt-6">

        {/* Dashboards: Global & Personal */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Global Protocol Reserves */}
          <div 
            onMouseEnter={() => setMentorSection('protocol-reserves')}
            onMouseLeave={() => setMentorSection('none')}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-[2rem] blur-xl opacity-30 dark:opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-2xl shadow-xl dark:shadow-none overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="p-1.5 bg-green-500/10 dark:bg-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  Protocol Reserves
                </h2>
                <span className="text-[10px] text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Pool Total</span>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">TKNA Global</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">TKNB Global</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* My Personal Liquidity */}
          <div 
            onMouseEnter={() => setMentorSection('liquidity')}
            onMouseLeave={() => setMentorSection('none')}
            className="relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-[2rem] blur-xl opacity-30 dark:opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-2xl shadow-xl dark:shadow-none overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="p-1.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </div>
                  My Liquidity
                </h2>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Active Position</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">My TKNA Share</p>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{isConnected ? userAmount0 : "0.00"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">My TKNB Share</p>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{isConnected ? userAmount1 : "0.00"}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-500/5 dark:bg-indigo-500/5 p-4 rounded-2xl border border-indigo-500/20 dark:border-indigo-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-indigo-600/60 dark:text-indigo-300/60 uppercase tracking-widest">LP Pool Shares</p>
                    <p className="text-lg font-mono font-bold text-indigo-600 dark:text-indigo-200">{isConnected ? userSharesFormatted : "0.00"}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M2 12c0-4.4 3.6-8 8-8 1.6 0 3 .5 4.2 1.4L18 4v6h-6l2.1-2.1c-.8-.6-1.8-.9-2.9-.9-3.3 0-6 2.7-6 6"></path><path d="M22 12c0 4.4-3.6 8-8 8-1.6 0-3-.5-4.2-1.4L6 20v-6h6l-2.1 2.1c.8.6 1.8.9 2.9.9 3.3 0 6-2.7 6-6"></path></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SWAP WIDGET */}
        <div 
          onMouseEnter={() => setMentorSection('swap')}
          onMouseLeave={() => setMentorSection('none')}
          className="lg:col-span-8 relative"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/30 via-purple-500/20 to-fuchsia-500/30 rounded-[2.5rem] blur-xl opacity-60 dark:opacity-30"></div>
          <div className="relative bg-v-card border border-v-border rounded-[2rem] p-6 sm:p-8 backdrop-blur-3xl shadow-xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] min-h-[500px] flex flex-col z-10 transition-all">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Swap
              </h2>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.05]">
                <div className={`w-2 h-2 rounded-full ${feePercentage === "0.30" ? "bg-indigo-500 dark:bg-indigo-400" : "bg-amber-500 dark:bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"}`} />
                <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-gray-300">
                  Fee: <span className={feePercentage === "0.30" ? "text-slate-900 dark:text-white" : "text-amber-600 dark:text-amber-400"}>{feePercentage}%</span>
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-2 relative">
              {/* Input Box 1 */}
              <div className="relative p-[1px] rounded-3xl bg-slate-200 dark:bg-gradient-to-b dark:from-white/10 dark:to-white/5 overflow-hidden transition-all duration-300 focus-within:ring-2 focus-within:ring-indigo-500/50 dark:focus-within:from-indigo-500/50 group shadow-inner dark:shadow-none bg-slate-100 dark:bg-black/20">
                <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px] relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-300 transition-colors">You Pay</p>
                    <p className="text-xs font-medium text-slate-400 dark:text-gray-500">
                      Balance: <span className="text-slate-600 dark:text-gray-300 font-mono">{userBalanceIn ? Number(formatUnits(userBalanceIn as bigint, 18)).toFixed(4) : "0.00"}</span>
                    </p>
                  </div>
                  <div className="flex justify-between items-center">
                    <input
                      type="number"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      placeholder="0"
                      className="bg-transparent text-3xl sm:text-4xl text-slate-900 dark:text-gray-100 outline-none w-[50%] sm:w-[60%] font-semibold placeholder-slate-300 dark:placeholder-gray-700"
                    />
                    <button
                      onClick={() => setIsToken0ToToken1(!isToken0ToToken1)}
                      className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 transition-all shadow-sm active:scale-95 shrink-0"
                    >
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-inner ${isToken0ToToken1 ? 'bg-gradient-to-br from-indigo-400 to-blue-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`} />
                      <span className="font-bold text-slate-700 dark:text-white text-sm sm:text-base">{symbolIn}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 dark:text-gray-500"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Swap Switch Arrow */}
              <div className="absolute left-[50%] -translate-x-1/2 top-[50%] -translate-y-1/2 z-20">
                <button
                  onClick={() => setIsToken0ToToken1(!isToken0ToToken1)}
                  className="p-3 bg-white dark:bg-[#131b31] border-4 border-slate-50 dark:border-[#0d1326] rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-white transition-all shadow-xl hover:-translate-y-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
                </button>
              </div>

              {/* Input Box 2 (Output) */}
              <div className="relative p-[1px] rounded-3xl bg-slate-200 dark:bg-white/5 overflow-hidden shadow-inner dark:shadow-none bg-slate-100 dark:bg-black/20 mt-2">
                <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px] relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400">You Receive</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <input
                      type="text"
                      value={expectedAmountOut}
                      placeholder="0"
                      className="bg-transparent text-3xl sm:text-4xl text-slate-700 dark:text-gray-300 outline-none w-[50%] sm:w-[60%] font-semibold placeholder-slate-200 dark:placeholder-gray-700 pointer-events-none truncate"
                      readOnly
                    />
                    <button className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 cursor-default opacity-80 shrink-0">
                      <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-inner ${!isToken0ToToken1 ? 'bg-gradient-to-br from-indigo-400 to-purple-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`} />
                      <span className="font-bold text-slate-700 dark:text-white text-sm sm:text-base">{symbolOut}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={isPending || !amountIn || Number(amountIn) <= 0 || !isConnected || isInsufficientBalance}
              className="w-full mt-8 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl shadow-xl dark:shadow-none"
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${isPending ? 'from-slate-600 to-slate-500' : 'from-indigo-600 via-purple-600 to-indigo-700 bg-[length:200%_auto] hover:bg-[position:right_center]'} transition-all duration-500`} />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-10 transition-opacity" />
              <div className="relative py-4 sm:py-5 px-6 flex items-center justify-center font-bold text-base sm:text-lg text-white tracking-wide h-14 sm:h-16">
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

          {/* POOL & ADD LIQUIDITY WIDGET (MOVED TO BALANCE LAYOUT) */}
          <div 
            onMouseEnter={() => setMentorSection('protocol-reserves')}
            onMouseLeave={() => setMentorSection('none')}
            className="mt-8 relative p-[1px] rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-emerald-500/10 shadow-xl dark:shadow-[0_0_40px_rgba(34,197,94,0.05)]"
          >
            <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-8 border border-v-border transition-all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Pool Status */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                    <span className="text-blue-500 dark:text-blue-400">💧</span> Protocol Liquidity
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-start gap-1 shadow-inner dark:shadow-none">
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">TKNA Reserve</span>
                      <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toFixed(2) : "0.00"}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-start gap-1 shadow-inner dark:shadow-none">
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">TKNB Reserve</span>
                      <span className="font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toFixed(2) : "0.00"}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Add Liquidity Inputs */}
                <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                  <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Provide Liquidity
                  </p>
                  <div className="flex flex-col gap-3 mb-4">
                    <input
                      type="number"
                      value={liqAmount0}
                      onChange={(e) => handleLiqAmount0Change(e.target.value)}
                      placeholder="TKNA Amount"
                      className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 sm:py-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-300 dark:placeholder-gray-600 font-mono shadow-inner dark:shadow-none"
                    />
                    <input
                      type="number"
                      value={liqAmount1}
                      onChange={(e) => handleLiqAmount1Change(e.target.value)}
                      placeholder="TKNB Amount"
                      className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 sm:py-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 transition-colors placeholder-slate-300 dark:placeholder-gray-600 font-mono shadow-inner dark:shadow-none"
                    />
                  </div>
                  <button
                    onClick={handleAddLiquidity}
                    disabled={isPending || !liqAmount0 || !liqAmount1 || !isConnected}
                    className="w-full py-3.5 sm:py-4 bg-indigo-600 dark:bg-white/5 hover:bg-indigo-700 dark:hover:bg-emerald-500/20 text-white dark:hover:text-emerald-300 disabled:opacity-50 disabled:hover:bg-indigo-600 dark:disabled:hover:bg-white/5 disabled:text-white/70 dark:disabled:text-gray-500 border border-transparent dark:border-white/10 hover:border-transparent dark:hover:border-emerald-500/50 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                  >
                    {isPending ? "Executing..." : "+ Add Liquidity"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE PANELS (GAMIFICATION & AI) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          <EVMMentor 
            currentFeeBps={currentFeeBps ? Number(currentFeeBps) : undefined}
            pointsBalance={pointsBalance ? (pointsBalance as bigint) : undefined}
            isPending={isPending}
            activeSection={mentorSection}
            isTypingInput={!!amountIn || !!liqAmount0 || !!liqAmount1}
          />

          {/* POINTS / REWARDS SUMMARY */}
          <div 
            onMouseEnter={() => setMentorSection('rewards')}
            onMouseLeave={() => setMentorSection('none')}
            className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-transparent group overflow-hidden shadow-xl dark:shadow-[0_0_30px_rgba(0,0,0,0.3)]"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 dark:bg-amber-500/10 blur-[60px] group-hover:bg-amber-500/15 transition-colors" />
            <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-7 relative z-10 border border-v-border transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <span className="text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">🏆</span> Reward Points
                  </h3>
                  <p className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-500/70">ERC-1155 LOYALTY HOOK</p>
                </div>
              </div>

              <div className="flex items-end gap-3 my-4 sm:my-6">
                 <span className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-amber-600 dark:from-white dark:to-amber-200 drop-shadow-sm truncate">
                  {isConnected ? (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)).toFixed(2) : "0.00") : "0.00"}
                </span>
                <span className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-500 mb-1 sm:mb-2">PTS</span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-black/40 h-3 rounded-full overflow-hidden shadow-inner border border-slate-300 dark:border-white/5">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 h-full w-[65%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* REWARD MARKETPLACE */}
          <div 
            onMouseEnter={() => setMentorSection('available-rewards')}
            onMouseLeave={() => setMentorSection('none')}
            className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-slate-200/50 to-slate-100/10 dark:from-white/10 dark:to-transparent shadow-lg dark:shadow-none"
          >
            <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-5 sm:p-6 border border-v-border transition-all">
              <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-gray-400 mb-4 ml-1 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Available Rewards
              </p>
              <div className="space-y-3">
                {/* Beneficio 1: Descuento de Fee */}
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500/50 transition-all group/item shadow-sm dark:shadow-none">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎟️</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Fee Discount</p>
                        <p className="text-[12px] text-slate-500 dark:text-gray-500 font-medium">-50% for 24h</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">10 PTS</span>
                  </div>
                  <button 
                    onClick={() => handleRedeem(101, 10)}
                    disabled={isPending || !isConnected || (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)) < 10 : true)}
                    className="w-full mt-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Redeem Reward
                  </button>
                </div>

                {/* Beneficio 2: Acceso VIP */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 opacity-60">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💎</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Premium Pools</p>
                        <p className="text-[12px] text-slate-500 dark:text-gray-500 font-medium">Early Access</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 dark:text-gray-500 bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded-md">50 PTS</span>
                  </div>
                  <button disabled className="w-full mt-2 py-2 bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-gray-500 rounded-xl text-[10px] font-bold uppercase">Locked</button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
