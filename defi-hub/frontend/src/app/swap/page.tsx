'use client'

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, usePublicClient, useChainId, useSwitchChain } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { sepolia } from 'wagmi/chains'
import { useState, useEffect, useMemo } from 'react'
import { EVMMentor, EcosystemType } from '../../components/EVMMentor'
import { EcosystemSelector } from '../../components/EcosystemSelector'
import { connectStellarWallet, StellarWalletState, STELLAR_CONFIG } from '../../lib/stellar'

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

const HOOK_ADDRESS = process.env.NEXT_PUBLIC_DYNAMIC_HOOK_ADDRESS || "0x94c0b5d70c3fd6802ace0736ccb0f8e624fc5028"
const TOKEN0_ADDRESS = process.env.NEXT_PUBLIC_TOKEN0_ADDRESS || "0xba4164f1829b8e1eef0f78b6aee517d8fdac34ee"
const TOKEN1_ADDRESS = process.env.NEXT_PUBLIC_TOKEN1_ADDRESS || "0x7ba20dcd66d3ea1f8e2f56a25ba8db58aee6735e"
const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS || "0x33e5adf857f02c5e56174c99b610c86e04610a6d"
const POINTS_HOOK_ADDRESS = process.env.NEXT_PUBLIC_POINTS_HOOK_ADDRESS || "0x8e3ababc691790ac21f1cfc82ece0bd9d25b93b8"

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

export default function SwapPage() {
  // --- Ecosistema (EVM vs Stellar) ---
  const [ecosystem, setEcosystem] = useState<EcosystemType>('evm')
  const isStellar = ecosystem === 'stellar'

  // --- EVM State ---
  const { address, isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain()
  const isWrongNetwork = isConnected && !isStellar && chainId !== sepolia.id
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mentorSection, setMentorSection] = useState<'swap' | 'liquidity' | 'rewards' | 'available-rewards' | 'protocol-reserves' | 'tkna' | 'tknb' | 'none'>('none')

  // --- Stellar Soroban State ---
  const [stellarWallet, setStellarWallet] = useState<StellarWalletState>({
    isConnected: false,
    publicKey: null,
    network: STELLAR_CONFIG.network,
    isFreighterAvailable: false,
    isDemoMode: false,
    balanceXlm: 1250.50,
    balanceVrtx: 3400.00,
  })
  const [stellarReserves, setStellarReserves] = useState({ xlm: 50000, vrtx: 150000 })
  const [stellarUserShares, setStellarUserShares] = useState(150.00)
  const [stellarPoints, setStellarPoints] = useState(45.00)
  const [stellarAmountIn, setStellarAmountIn] = useState('')
  const [isXlmToVrtx, setIsXlmToVrtx] = useState(true)
  const [stellarLiq0, setStellarLiq0] = useState('')
  const [stellarLiq1, setStellarLiq1] = useState('')
  const [isStellarPending, setIsStellarPending] = useState(false)

  // Inicializar tema y ecosistema
  useEffect(() => {
    setMounted(true)
    const savedTheme = (localStorage.getItem('vortex-theme') as 'light' | 'dark') || 'dark'
    setTheme(savedTheme)
    const savedEco = (localStorage.getItem('vortex-ecosystem') as EcosystemType) || 'evm'
    setEcosystem(savedEco)
    
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

  const handleEcosystemChange = (eco: EcosystemType) => {
    setEcosystem(eco)
    localStorage.setItem('vortex-ecosystem', eco)
  }

  // --- STELLAR ACTIONS ---
  const handleConnectStellar = async () => {
    setIsStellarPending(true)
    try {
      const state = await connectStellarWallet()
      setStellarWallet(state)
    } finally {
      setIsStellarPending(false)
    }
  }

  const handleDisconnectStellar = () => {
    setStellarWallet({
      isConnected: false,
      publicKey: null,
      network: STELLAR_CONFIG.network,
      isFreighterAvailable: false,
      isDemoMode: false,
      balanceXlm: 0,
      balanceVrtx: 0,
    })
  }

  const handleStellarFaucet = (token: 'xlm' | 'vrtx') => {
    if (token === 'xlm') {
      setStellarWallet(prev => ({ ...prev, balanceXlm: prev.balanceXlm + 100 }))
    } else {
      setStellarWallet(prev => ({ ...prev, balanceVrtx: prev.balanceVrtx + 500 }))
    }
  }

  const stellarExpectedOut = useMemo(() => {
    if (!stellarAmountIn || Number(stellarAmountIn) <= 0) return ''
    const val = Number(stellarAmountIn)
    const rIn = isXlmToVrtx ? stellarReserves.xlm : stellarReserves.vrtx
    const rOut = isXlmToVrtx ? stellarReserves.vrtx : stellarReserves.xlm
    // Soroban AMM formula x * y = k with 0.05% fee
    const inWithFee = val * 0.9995
    const out = (rOut * inWithFee) / (rIn + inWithFee)
    return out.toFixed(4)
  }, [stellarAmountIn, isXlmToVrtx, stellarReserves])

  const handleStellarSwap = async () => {
    if (!stellarAmountIn || Number(stellarAmountIn) <= 0) return
    setIsStellarPending(true)
    try {
      await new Promise(r => setTimeout(r, 1200)) // Simulación de confirmación de bloque Stellar (3-5s real, 1.2s para pitch fluido)
      const val = Number(stellarAmountIn)
      const out = Number(stellarExpectedOut)

      if (isXlmToVrtx) {
        setStellarWallet(prev => ({
          ...prev,
          balanceXlm: Math.max(0, prev.balanceXlm - val - 0.00001),
          balanceVrtx: prev.balanceVrtx + out,
        }))
        setStellarReserves(prev => ({ xlm: prev.xlm + val, vrtx: Math.max(0, prev.vrtx - out) }))
      } else {
        setStellarWallet(prev => ({
          ...prev,
          balanceVrtx: Math.max(0, prev.balanceVrtx - val),
          balanceXlm: prev.balanceXlm + out - 0.00001,
        }))
        setStellarReserves(prev => ({ vrtx: prev.vrtx + val, xlm: Math.max(0, prev.xlm - out) }))
      }

      setStellarPoints(prev => prev + 2.5) // Recompensa en puntos Soroban
      setStellarAmountIn('')
      alert(`¡Swap completado en Soroban Testnet!\nComisión de red: 0.00001 XLM\nPuntos de lealtad otorgados: +2.5 PTS`)
    } finally {
      setIsStellarPending(false)
    }
  }

  const handleStellarAddLiq = async () => {
    if (!stellarLiq0 || !stellarLiq1) return
    setIsStellarPending(true)
    try {
      await new Promise(r => setTimeout(r, 1200))
      const a0 = Number(stellarLiq0)
      const a1 = Number(stellarLiq1)
      setStellarWallet(prev => ({
        ...prev,
        balanceXlm: Math.max(0, prev.balanceXlm - a0 - 0.00001),
        balanceVrtx: Math.max(0, prev.balanceVrtx - a1),
      }))
      setStellarReserves(prev => ({ xlm: prev.xlm + a0, vrtx: prev.vrtx + a1 }))
      setStellarUserShares(prev => prev + (a0 * 0.1))
      setStellarLiq0('')
      setStellarLiq1('')
      alert('¡Liquidez añadida con éxito al Pool Soroban en Stellar!')
    } finally {
      setIsStellarPending(false)
    }
  }

  // --- EVM CONTRACT HOOKS ---
  const { data: currentFeeBps, refetch: refetchFee } = useReadContract({
    address: HOOK_ADDRESS as `0x${string}`,
    abi: DYNAMIC_FEE_HOOK_ABI,
    functionName: 'getDynamicFee',
    query: { enabled: !!address && !isStellar },
  })

  const { data: pointsBalance, refetch: refetchPoints } = useReadContract({
    address: POINTS_HOOK_ADDRESS as `0x${string}`,
    abi: ERC1155_ABI,
    functionName: 'balanceOf',
    args: address ? [address, BigInt(1)] : undefined,
    query: { enabled: !!address && !isStellar },
  })

  const feePercentage = isStellar ? "0.05" : (Number(currentFeeBps ?? 30) / 100).toFixed(2)

  const publicClient = usePublicClient()
  const { writeContractAsync, isPending: isWritePending } = useWriteContract()
  const [isTxPending, setIsTxPending] = useState(false)
  const isPending = isStellar ? isStellarPending : (isWritePending || isTxPending)

  // Balances EVM
  const { data: balanceA, refetch: refetchA } = useReadContract({
    address: TOKEN0_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isStellar },
  })

  const { data: balanceB, refetch: refetchB } = useReadContract({
    address: TOKEN1_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isStellar },
  })

  const { data: reserve0, refetch: refetchR0 } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'reserve0',
    query: { enabled: !isStellar },
  })

  const { data: reserve1, refetch: refetchR1 } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'reserve1',
    query: { enabled: !isStellar },
  })

  const { data: lpBalance, refetch: refetchLP } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !isStellar },
  })

  const { data: totalSupply, refetch: refetchTotalSupply } = useReadContract({
    address: AMM_ADDRESS as `0x${string}`,
    abi: AMM_ABI,
    functionName: 'totalSupply',
    query: { enabled: !isStellar },
  })

  const userAmount0 = useMemo(() => {
    if (!lpBalance || !totalSupply || !reserve0 || (totalSupply as bigint) === BigInt(0)) return "0.00"
    const amount = ((lpBalance as bigint) * (reserve0 as bigint)) / (totalSupply as bigint)
    return Number(formatUnits(amount, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 })
  }, [lpBalance, totalSupply, reserve0])

  const userAmount1 = useMemo(() => {
    if (!lpBalance || !totalSupply || !reserve1 || (totalSupply as bigint) === BigInt(0)) return "0.00"
    const amount = ((lpBalance as bigint) * (reserve1 as bigint)) / (totalSupply as bigint)
    return Number(formatUnits(amount, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 })
  }, [lpBalance, totalSupply, reserve1])

  const userSharesFormatted = useMemo(() => {
    if (!lpBalance) return "0.00"
    return Number(formatUnits(lpBalance as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 })
  }, [lpBalance])

  const refetchAll = () => {
    refetchA()
    refetchB()
    refetchR0()
    refetchR1()
    refetchFee()
    refetchLP()
    refetchTotalSupply()
    refetchPoints()
  }

  // Swap EVM
  const [amountIn, setAmountIn] = useState("")
  const [isToken0ToToken1, setIsToken0ToToken1] = useState(true)
  const [liqAmount0, setLiqAmount0] = useState("")
  const [liqAmount1, setLiqAmount1] = useState("")

  const tokenInAddress = isToken0ToToken1 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS
  const symbolIn = isToken0ToToken1 ? "TKNA" : "TKNB"
  const symbolOut = isToken0ToToken1 ? "TKNB" : "TKNA"
  const userBalanceIn = isToken0ToToken1 ? balanceA : balanceB
  const isInsufficientBalance = Boolean(amountIn && userBalanceIn !== undefined && parseUnits(amountIn, 18) > (userBalanceIn as bigint))

  const handleFaucet = async (token: number) => {
    if (!publicClient) return
    try {
      setIsTxPending(true)
      const hash = await writeContractAsync({
        address: (token === 0 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS) as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'faucet',
      })
      await publicClient.waitForTransactionReceipt({ hash, retryCount: 10, pollingInterval: 4000 })
      refetchAll()
    } catch (error) {
      console.error("Faucet failed:", error)
    } finally {
      setIsTxPending(false)
    }
  }

  const handleSwap = async () => {
    if (!amountIn || Number(amountIn) <= 0 || !publicClient) return
    const amountInWei = parseUnits(amountIn, 18)

    try {
      setIsTxPending(true)
      const approveHash = await writeContractAsync({
        address: tokenInAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [AMM_ADDRESS, amountInWei]
      })
      await publicClient.waitForTransactionReceipt({ hash: approveHash })

      const swapHash = await writeContractAsync({
        address: AMM_ADDRESS as `0x${string}`,
        abi: AMM_ABI,
        functionName: 'swap',
        args: [tokenInAddress, amountInWei]
      })
      await publicClient.waitForTransactionReceipt({ hash: swapHash, retryCount: 10, pollingInterval: 4000 })
      refetchAll()
      setAmountIn("")
    } catch (error) {
      console.error("Swap failed:", error)
      const msg = (error as { shortMessage?: string })?.shortMessage || (error as Error)?.message || "Transaction failed"
      alert("Swap Failed: \n" + msg)
    } finally {
      setIsTxPending(false)
    }
  }

  const handleAddLiquidity = async () => {
    if (!liqAmount0 || !liqAmount1 || !publicClient) return
    const r0 = parseUnits(liqAmount0, 18)
    const r1 = parseUnits(liqAmount1, 18)

    try {
      setIsTxPending(true)
      const a0Hash = await writeContractAsync({ address: TOKEN0_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [AMM_ADDRESS, r0] })
      await publicClient.waitForTransactionReceipt({ hash: a0Hash })
      const a1Hash = await writeContractAsync({ address: TOKEN1_ADDRESS as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [AMM_ADDRESS, r1] })
      await publicClient.waitForTransactionReceipt({ hash: a1Hash })

      const addHash = await writeContractAsync({ address: AMM_ADDRESS as `0x${string}`, abi: AMM_ABI, functionName: 'addLiquidity', args: [r0, r1] })
      await publicClient.waitForTransactionReceipt({ hash: addHash, retryCount: 10, pollingInterval: 4000 })
      refetchAll()
      setLiqAmount0("")
      setLiqAmount1("")
    } catch (error) {
      console.error("Add Liquidity failed:", error)
    } finally {
      setIsTxPending(false)
    }
  }

  const handleRedeem = async (rewardId: number, amount: number) => {
    if (!publicClient || !address) return
    try {
      setIsTxPending(true)
      const hash = await writeContractAsync({
        address: POINTS_HOOK_ADDRESS as `0x${string}`,
        abi: POINTS_HOOK_ABI,
        functionName: 'redeem',
        args: [BigInt(rewardId), parseUnits(amount.toString(), 18)],
      })
      await publicClient.waitForTransactionReceipt({ hash, retryCount: 10, pollingInterval: 4000 })
      refetchAll()
      alert("¡Canje exitoso! Beneficio activado en Sepolia.")
    } catch (error) {
      alert("Error al canjear: " + (error as Error).message)
    } finally {
      setIsTxPending(false)
    }
  }

  const expectedAmountOut = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0 || !reserve0 || !reserve1 || (reserve0 as bigint) === BigInt(0) || (reserve1 as bigint) === BigInt(0)) return ""
    try {
      const amountInBig = parseUnits(amountIn, 18)
      const reserveIn = isToken0ToToken1 ? (reserve0 as bigint) : (reserve1 as bigint)
      const reserveOut = isToken0ToToken1 ? (reserve1 as bigint) : (reserve0 as bigint)
      const feeBps = BigInt(currentFeeBps ? currentFeeBps.toString() : "30")
      const amountInWithFee = (amountInBig * (BigInt(10000) - feeBps)) / BigInt(10000)
      const amountOutBig = (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
      return Number(formatUnits(amountOutBig, 18)).toFixed(4)
    } catch {
      return ""
    }
  }, [amountIn, reserve0, reserve1, isToken0ToToken1, currentFeeBps])

  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 bg-background text-foreground relative overflow-hidden font-sans selection:bg-indigo-500/30 transition-colors duration-500">
      
      {/* Background Orbs */}
      <div className={`absolute top-[-10%] -left-[5%] w-[600px] h-[600px] ${isStellar ? 'bg-cyan-500/25 dark:bg-cyan-600/10' : 'bg-indigo-500/30 dark:bg-indigo-600/10'} rounded-full blur-[140px] pointer-events-none transition-all duration-700`} />
      <div className={`absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] ${isStellar ? 'bg-blue-500/20 dark:bg-blue-600/10' : 'bg-fuchsia-500/20 dark:bg-purple-600/10'} rounded-full blur-[160px] pointer-events-none transition-all duration-700`} />

      {/* Wrong Network Banner (EVM only) */}
      {isWrongNetwork && (
        <div className="w-full max-w-6xl z-20 mt-2">
          <div className="flex items-center justify-between gap-3 bg-orange-500/10 border border-orange-500/40 rounded-2xl px-5 py-3 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="text-orange-400 text-xl">⚠️</span>
              <p className="text-sm text-orange-200 font-medium">
                <strong>Red incorrecta.</strong> Estás en chain ID <span className="font-mono bg-orange-500/20 px-1 rounded">{chainId}</span>. Esta app requiere <strong>Sepolia Testnet</strong> (11155111).
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
      <header className="w-full max-w-6xl flex flex-wrap justify-between items-center py-4 z-10 border-b border-v-border bg-v-card backdrop-blur-md px-6 sm:px-8 rounded-3xl mt-2 sticky top-4 shadow-xl shadow-slate-200/50 dark:shadow-black/20 gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isStellar ? 'from-cyan-500 to-blue-600 shadow-cyan-500/30' : 'from-indigo-500 to-violet-600 shadow-indigo-500/30'} flex items-center justify-center shadow-lg transition-all`}>
            <span className="text-white text-xl">{isStellar ? '🚀' : '🌪️'}</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-none">
              Vortex <span className={isStellar ? 'text-cyan-500' : 'text-indigo-500'}>{isStellar ? 'Soroban' : 'Sepolia'}</span>
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
              {isStellar ? 'Stellar Testnet Engine' : 'EVM Modular DEX'}
            </p>
          </div>
        </div>

        {/* Center: Ecosystem Selector */}
        <EcosystemSelector current={ecosystem} onChange={handleEcosystemChange} compact />

        {/* Right: Wallet & Theme Controls */}
        <div className="flex gap-3 items-center">
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

          {isStellar ? (
            /* Stellar Wallet Control */
            stellarWallet.isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                  <button onClick={() => handleStellarFaucet('xlm')} className="px-3 py-1.5 text-cyan-600 dark:text-cyan-300 rounded-xl hover:bg-cyan-500/10 text-xs font-bold uppercase transition-all">
                    + 100 XLM
                  </button>
                  <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-1" />
                  <button onClick={() => handleStellarFaucet('vrtx')} className="px-3 py-1.5 text-blue-600 dark:text-blue-300 rounded-xl hover:bg-blue-500/10 text-xs font-bold uppercase transition-all">
                    + 500 VRTX
                  </button>
                </div>

                <div className="px-3.5 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-600 dark:text-cyan-300 font-medium text-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono">{stellarWallet.publicKey?.slice(0, 4)}...{stellarWallet.publicKey?.slice(-4)}</span>
                  {stellarWallet.isDemoMode && <span className="text-[9px] bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-500 font-bold uppercase">Pitch Demo</span>}
                </div>

                <button onClick={handleDisconnectStellar} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all">
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectStellar}
                disabled={isStellarPending}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
              >
                {isStellarPending ? 'Connecting...' : 'Connect Freighter'}
              </button>
            )
          ) : (
            /* EVM Wallet Control */
            isConnected ? (
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <div className="hidden sm:flex items-center bg-slate-100 dark:bg-black/40 p-1.5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                  <button onMouseEnter={() => setMentorSection('tkna')} onMouseLeave={() => setMentorSection('none')} onClick={() => handleFaucet(0)} disabled={isPending} className="px-3 py-1.5 text-indigo-600 dark:text-indigo-300 rounded-xl hover:bg-indigo-500/10 text-xs font-bold uppercase transition-all">
                    + TKNA
                  </button>
                  <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 mx-1" />
                  <button onMouseEnter={() => setMentorSection('tknb')} onMouseLeave={() => setMentorSection('none')} onClick={() => handleFaucet(1)} disabled={isPending} className="px-3 py-1.5 text-cyan-600 dark:text-cyan-300 rounded-xl hover:bg-cyan-500/10 text-xs font-bold uppercase transition-all">
                    + TKNB
                  </button>
                </div>

                <div className="px-3.5 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-medium text-xs flex items-center gap-2 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-slate-600 dark:text-gray-300">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
                <button onClick={() => disconnect()} className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-center hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {connectors.map((connector) => (
                  <button key={connector.uid} onClick={() => connect({ connector })} className="px-5 py-2.5 bg-indigo-600 dark:bg-white text-white dark:text-black hover:bg-indigo-700 dark:hover:bg-indigo-50 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95">
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 mt-6">
        
        {/* Dashboards: Global & Personal */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Global Protocol Reserves */}
          <div onMouseEnter={() => setMentorSection('protocol-reserves')} onMouseLeave={() => setMentorSection('none')} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${isStellar ? 'from-cyan-500/10 to-blue-500/10' : 'from-green-500/10 to-emerald-500/10'} rounded-[2rem] blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-700`} />
            <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-2xl shadow-xl overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className={`p-1.5 rounded-lg ${isStellar ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-green-500/10 text-green-600 dark:text-green-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  {isStellar ? 'Soroban Pool Reserves' : 'Protocol Reserves (Sepolia)'}
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isStellar ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'}`}>
                  {isStellar ? 'Stellar Testnet' : 'Sepolia Pool'}
                </span>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">{isStellar ? 'XLM Global Pool' : 'TKNA Global'}</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {isStellar ? stellarReserves.xlm.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00")}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">{isStellar ? 'VRTX Soroban Token Global' : 'TKNB Global'}</p>
                  <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                    {isStellar ? stellarReserves.vrtx.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toLocaleString('en-US', { minimumFractionDigits: 2 }) : "0.00")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* My Personal Liquidity */}
          <div onMouseEnter={() => setMentorSection('liquidity')} onMouseLeave={() => setMentorSection('none')} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${isStellar ? 'from-blue-500/10 to-cyan-500/10' : 'from-purple-500/10 to-indigo-500/10'} rounded-[2rem] blur-xl opacity-40 group-hover:opacity-100 transition-opacity duration-700`} />
            <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-2xl shadow-xl overflow-hidden transition-all">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className={`p-1.5 rounded-lg ${isStellar ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  </div>
                  My Liquidity
                </h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isStellar ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20'}`}>
                  {isStellar ? 'Soroban Shares' : 'Active Position'}
                </span>
              </div>
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner dark:shadow-none">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">{isStellar ? 'My XLM Share' : 'My TKNA Share'}</p>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                        {isStellar ? (stellarWallet.isConnected ? (stellarUserShares * 2.5).toFixed(2) : "0.00") : (isConnected ? userAmount0 : "0.00")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">{isStellar ? 'My VRTX Share' : 'My TKNB Share'}</p>
                      <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">
                        {isStellar ? (stellarWallet.isConnected ? (stellarUserShares * 7.5).toFixed(2) : "0.00") : (isConnected ? userAmount1 : "0.00")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${isStellar ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">LP Pool Shares</p>
                    <p className="text-lg font-mono font-bold">{isStellar ? (stellarWallet.isConnected ? stellarUserShares.toFixed(2) : "0.00") : (isConnected ? userSharesFormatted : "0.00")}</p>
                  </div>
                  <div className="text-xs font-mono opacity-60">
                    {isStellar ? 'Soroban WASM Storage' : 'EVM Pair Contract'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SWAP WIDGET */}
        <div onMouseEnter={() => setMentorSection('swap')} onMouseLeave={() => setMentorSection('none')} className="lg:col-span-8 relative">
          <div className={`absolute -inset-0.5 bg-gradient-to-br ${isStellar ? 'from-cyan-500/30 via-blue-500/20 to-sky-500/30' : 'from-indigo-500/30 via-purple-500/20 to-fuchsia-500/30'} rounded-[2.5rem] blur-xl opacity-60 transition-all duration-700`} />
          <div className="relative bg-v-card border border-v-border rounded-[2rem] p-6 sm:p-8 backdrop-blur-3xl shadow-xl min-h-[500px] flex flex-col z-10 transition-all">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Swap</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-black uppercase ${isStellar ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'}`}>
                    {isStellar ? 'Stellar Soroban' : 'Ethereum Sepolia'}
                  </span>
                </h2>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-black/40 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.05]">
                <div className={`w-2 h-2 rounded-full ${isStellar ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : feePercentage === '0.30' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-gray-300">
                  Fee: <span className="font-bold">{feePercentage}% {isStellar && '(+ 0.00001 XLM)'}</span>
                </span>
              </div>
            </div>

            {isStellar ? (
              /* STELLAR SWAP FORM */
              <div className="flex-1 flex flex-col justify-center space-y-2 relative">
                {/* Input 1 */}
                <div className="relative p-[1px] rounded-3xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                  <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium text-slate-500 dark:text-gray-400">You Pay ({isXlmToVrtx ? 'Native' : 'Soroban'})</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-gray-500">
                        Balance: <span className="font-mono text-slate-700 dark:text-gray-200">{isXlmToVrtx ? stellarWallet.balanceXlm.toFixed(2) : stellarWallet.balanceVrtx.toFixed(2)}</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <input
                        type="number"
                        value={stellarAmountIn}
                        onChange={(e) => setStellarAmountIn(e.target.value)}
                        placeholder="0"
                        className="bg-transparent text-3xl sm:text-4xl text-slate-900 dark:text-gray-100 outline-none w-[50%] font-semibold placeholder-slate-300 dark:placeholder-gray-700"
                      />
                      <button
                        onClick={() => setIsXlmToVrtx(!isXlmToVrtx)}
                        className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 active:scale-95"
                      >
                        <span className="text-xl">{isXlmToVrtx ? '🪐' : '🌪️'}</span>
                        <span className="font-bold text-sm sm:text-base">{isXlmToVrtx ? 'XLM' : 'VRTX'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Switch Arrow */}
                <div className="absolute left-[50%] -translate-x-1/2 top-[50%] -translate-y-1/2 z-20">
                  <button onClick={() => setIsXlmToVrtx(!isXlmToVrtx)} className="p-3 bg-white dark:bg-[#131b31] border-4 border-slate-50 dark:border-[#0d1326] rounded-2xl text-slate-400 hover:text-cyan-400 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
                  </button>
                </div>

                {/* Output 2 */}
                <div className="relative p-[1px] rounded-3xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 mt-2">
                  <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium text-slate-500 dark:text-gray-400">You Receive</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <input
                        type="text"
                        value={stellarExpectedOut}
                        placeholder="0"
                        className="bg-transparent text-3xl sm:text-4xl text-slate-700 dark:text-gray-300 outline-none w-[50%] font-semibold pointer-events-none"
                        readOnly
                      />
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 opacity-80">
                        <span className="text-xl">{!isXlmToVrtx ? '🪐' : '🌪️'}</span>
                        <span className="font-bold text-sm sm:text-base">{!isXlmToVrtx ? 'XLM' : 'VRTX'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleStellarSwap}
                  disabled={isPending || !stellarAmountIn || Number(stellarAmountIn) <= 0 || !stellarWallet.isConnected}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-2xl text-base shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isPending ? "Executing on Stellar Soroban..." : !stellarWallet.isConnected ? "Connect Freighter to Swap" : "Swap on Soroban"}
                </button>
              </div>
            ) : (
              /* EVM SEPOLIA SWAP FORM */
              <div className="flex-1 flex flex-col justify-center space-y-2 relative">
                {/* Input 1 */}
                <div className="relative p-[1px] rounded-3xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5">
                  <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium text-slate-500 dark:text-gray-400">You Pay</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-gray-500">
                        Balance: <span className="font-mono text-slate-700 dark:text-gray-200">{userBalanceIn ? Number(formatUnits(userBalanceIn as bigint, 18)).toFixed(4) : "0.00"}</span>
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <input
                        type="number"
                        value={amountIn}
                        onChange={(e) => setAmountIn(e.target.value)}
                        placeholder="0"
                        className="bg-transparent text-3xl sm:text-4xl text-slate-900 dark:text-gray-100 outline-none w-[50%] font-semibold placeholder-slate-300 dark:placeholder-gray-700"
                      />
                      <button onClick={() => setIsToken0ToToken1(!isToken0ToToken1)} className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 active:scale-95">
                        <div className={`w-5 h-5 rounded-full ${isToken0ToToken1 ? 'bg-indigo-500' : 'bg-cyan-500'}`} />
                        <span className="font-bold text-sm sm:text-base">{symbolIn}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Switch Arrow */}
                <div className="absolute left-[50%] -translate-x-1/2 top-[50%] -translate-y-1/2 z-20">
                  <button onClick={() => setIsToken0ToToken1(!isToken0ToToken1)} className="p-3 bg-white dark:bg-[#131b31] border-4 border-slate-50 dark:border-[#0d1326] rounded-2xl text-slate-400 hover:text-indigo-500 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path></svg>
                  </button>
                </div>

                {/* Output 2 */}
                <div className="relative p-[1px] rounded-3xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 mt-2">
                  <div className="bg-white dark:bg-[#0f162c] p-5 rounded-[23px]">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium text-slate-500 dark:text-gray-400">You Receive</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <input type="text" value={expectedAmountOut} placeholder="0" className="bg-transparent text-3xl sm:text-4xl text-slate-700 dark:text-gray-300 outline-none w-[50%] font-semibold pointer-events-none" readOnly />
                      <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 opacity-80">
                        <div className={`w-5 h-5 rounded-full ${!isToken0ToToken1 ? 'bg-indigo-500' : 'bg-cyan-500'}`} />
                        <span className="font-bold text-sm sm:text-base">{symbolOut}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSwap}
                  disabled={isPending || !amountIn || Number(amountIn) <= 0 || !isConnected || isInsufficientBalance}
                  className="w-full mt-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-bold rounded-2xl text-base shadow-xl disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isPending ? "Confirming in Wallet..." : !isConnected ? "Connect Wallet to Swap" : isInsufficientBalance ? `Insufficient ${symbolIn}` : "Swap on Sepolia"}
                </button>
              </div>
            )}

            {/* POOL & ADD LIQUIDITY WIDGET */}
            <div onMouseEnter={() => setMentorSection('protocol-reserves')} onMouseLeave={() => setMentorSection('none')} className="mt-8 relative p-[1px] rounded-[2rem] bg-gradient-to-br from-blue-500/20 to-emerald-500/10">
              <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-8 border border-v-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                      <span>💧</span> {isStellar ? 'Soroban Pool Liquidity' : 'Protocol Liquidity (Sepolia)'}
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <span className="text-xs font-semibold text-slate-500 uppercase">{isStellar ? 'XLM Reserve' : 'TKNA Reserve'}</span>
                        <p className="font-mono text-xl font-bold">{isStellar ? stellarReserves.xlm.toFixed(2) : (reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toFixed(2) : "0.00")}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                        <span className="text-xs font-semibold text-slate-500 uppercase">{isStellar ? 'VRTX Reserve' : 'TKNB Reserve'}</span>
                        <p className="font-mono text-xl font-bold">{isStellar ? stellarReserves.vrtx.toFixed(2) : (reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toFixed(2) : "0.00")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Provide Liquidity
                    </p>
                    <div className="flex flex-col gap-3 mb-4">
                      <input
                        type="number"
                        value={isStellar ? stellarLiq0 : liqAmount0}
                        onChange={(e) => isStellar ? setStellarLiq0(e.target.value) : setLiqAmount0(e.target.value)}
                        placeholder={isStellar ? "XLM Amount" : "TKNA Amount"}
                        className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono outline-none"
                      />
                      <input
                        type="number"
                        value={isStellar ? stellarLiq1 : liqAmount1}
                        onChange={(e) => isStellar ? setStellarLiq1(e.target.value) : setLiqAmount1(e.target.value)}
                        placeholder={isStellar ? "VRTX Amount" : "TKNB Amount"}
                        className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-mono outline-none"
                      />
                    </div>
                    <button
                      onClick={isStellar ? handleStellarAddLiq : handleAddLiquidity}
                      disabled={isPending || (isStellar ? (!stellarLiq0 || !stellarLiq1 || !stellarWallet.isConnected) : (!liqAmount0 || !liqAmount1 || !isConnected))}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 transition-all"
                    >
                      {isPending ? "Executing..." : "+ Add Liquidity"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDE PANELS (GAMIFICATION & MENTOR) */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <EVMMentor 
            currentFeeBps={isStellar ? 5 : (currentFeeBps ? Number(currentFeeBps) : undefined)}
            pointsBalance={isStellar ? undefined : (pointsBalance ? (pointsBalance as bigint) : undefined)}
            isPending={isPending}
            activeSection={mentorSection}
            isTypingInput={isStellar ? (!!stellarAmountIn || !!stellarLiq0 || !!stellarLiq1) : (!!amountIn || !!liqAmount0 || !!liqAmount1)}
            ecosystem={ecosystem}
          />

          {/* POINTS / REWARDS SUMMARY */}
          <div onMouseEnter={() => setMentorSection('rewards')} onMouseLeave={() => setMentorSection('none')} className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-orange-500/10 to-transparent overflow-hidden shadow-xl">
            <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-6 sm:p-7 relative z-10 border border-v-border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <span>🏆</span> {isStellar ? 'Soroban Loyalty PTS' : 'Reward Points'}
                  </h3>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-500/70">
                    {isStellar ? 'STELLAR SOROBAN TOKEN REWARDS' : 'ERC-1155 LOYALTY HOOK'}
                  </p>
                </div>
              </div>

              <div className="flex items-end gap-3 my-4">
                <span className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-amber-600 dark:from-white dark:to-amber-200">
                  {isStellar ? (stellarWallet.isConnected ? stellarPoints.toFixed(2) : "0.00") : (isConnected ? (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)).toFixed(2) : "0.00") : "0.00")}
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-500 mb-2">PTS</span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-black/40 h-3 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 h-full w-[70%] rounded-full" />
              </div>
            </div>
          </div>

          {/* REWARD MARKETPLACE */}
          <div onMouseEnter={() => setMentorSection('available-rewards')} onMouseLeave={() => setMentorSection('none')} className="relative p-[1px] rounded-[2rem] bg-gradient-to-br from-slate-200/50 to-slate-100/10 dark:from-white/10 dark:to-transparent shadow-lg">
            <div className="bg-v-card backdrop-blur-2xl w-full h-full rounded-[31px] p-5 sm:p-6 border border-v-border">
              <p className="text-xs font-medium text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> {isStellar ? 'Soroban Benefits' : 'Available Rewards'}
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-amber-500/50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎟️</span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Fee Discount</p>
                        <p className="text-[12px] text-slate-500">-50% for 24h</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">10 PTS</span>
                  </div>
                  <button 
                    onClick={() => isStellar ? (setStellarPoints(p => Math.max(0, p - 10)), alert("¡Beneficio de comisión activado en Soroban!")) : handleRedeem(101, 10)}
                    disabled={isPending || (isStellar ? (!stellarWallet.isConnected || stellarPoints < 10) : (!isConnected || (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)) < 10 : true)))}
                    className="w-full mt-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    Redeem Reward
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
