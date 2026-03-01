'use client'

import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useState, useEffect } from 'react'

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
const HOOK_ADDRESS = process.env.NEXT_PUBLIC_DYNAMIC_HOOK_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const POSITION_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_POSITION_MANAGER || "0x5FbDB2315678afecb367f032d93F642f64180aa3"

const POSITION_MANAGER_ABI = [
  {
    "type": "function",
    "name": "getOptimizedPosition",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "sharesA", "type": "uint128" }, { "name": "sharesB", "type": "uint128" }],
    "stateMutability": "view"
  }
]

const TOKEN0_ADDRESS = process.env.NEXT_PUBLIC_TOKEN0_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const TOKEN1_ADDRESS = process.env.NEXT_PUBLIC_TOKEN1_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
const AMM_ADDRESS = process.env.NEXT_PUBLIC_AMM_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"

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
  const sharesA = userPositionData ? (userPositionData as any[])[0]?.toString() : "0";
  const sharesB = userPositionData ? (userPositionData as any[])[1]?.toString() : "0";

  const { writeContract, isPending } = useWriteContract()

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

  const handleFaucet = (token: number) => {
    writeContract({
      address: (token === 0 ? TOKEN0_ADDRESS : TOKEN1_ADDRESS) as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'faucet',
    }, {
      onSuccess: () => {
        setTimeout(() => {
          refetchA();
          refetchB();
        }, 2000)
      }
    })
  }

  const handleSwap = () => {
    if (!amountIn || Number(amountIn) <= 0) return;
    const amountInWei = parseUnits(amountIn, 18);

    writeContract({
      address: tokenInAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AMM_ADDRESS, amountInWei]
    }, {
      onSuccess: () => {
        // Ejecutar swap tras la aprobación
        writeContract({
          address: AMM_ADDRESS as `0x${string}`,
          abi: AMM_ABI,
          functionName: 'swap',
          args: [tokenInAddress, amountInWei]
        }, {
          onSuccess: () => {
            setTimeout(() => {
              refetchA();
              refetchB();
              setAmountIn("");
            }, 2000)
          }
        })
      }
    })
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

  const handleAddLiquidity = () => {
    if (!liqAmount0 || !liqAmount1 || Number(liqAmount0) <= 0 || Number(liqAmount1) <= 0) return;
    const r0 = parseUnits(liqAmount0, 18);
    const r1 = parseUnits(liqAmount1, 18);

    writeContract({
      address: TOKEN0_ADDRESS as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [AMM_ADDRESS, r0]
    }, {
      onSuccess: () => {
        writeContract({
          address: TOKEN1_ADDRESS as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [AMM_ADDRESS, r1]
        }, {
          onSuccess: () => {
            writeContract({
              address: AMM_ADDRESS as `0x${string}`,
              abi: AMM_ABI,
              functionName: 'addLiquidity',
              args: [r0, r1]
            }, {
              onSuccess: () => {
                setTimeout(() => {
                  refetchAll();
                  setLiqAmount0("");
                  setLiqAmount1("");
                }, 2000)
              }
            })
          }
        })
      }
    })
  }

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-gradient-to-br from-gray-950 via-gray-900 to-black relative overflow-hidden">

      {/* Background Orbs */}
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center py-6 mb-12 z-10 border-b border-white/5">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
          DeFi Hub
        </h1>

        {mounted && (
          <div className="flex gap-4 items-center">
            {isConnected ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleFaucet(0)}
                  disabled={isPending}
                  className="px-4 py-1.5 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 text-xs font-medium transition"
                >
                  Faucet TKNA
                </button>
                <button
                  onClick={() => handleFaucet(1)}
                  disabled={isPending}
                  className="px-4 py-1.5 border border-cyan-500/30 text-cyan-300 rounded-xl hover:bg-cyan-500/10 text-xs font-medium transition mr-2"
                >
                  Faucet TKNB
                </button>

                <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 font-medium tracking-wide text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-all font-medium text-sm backdrop-blur-sm"
                  >
                    Connect {connector.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Dashboard */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 z-10">

        {/* Position Manager Dashboard (New) */}
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl hover:bg-white/10 transition duration-300 shadow-2xl lg:col-span-3">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="text-pink-400">📦</span> Position Manager (Assembly Optimized)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col justify-center items-center">
              <p className="text-sm text-gray-400 mb-1">TKNA Liquidity Shares</p>
              <p className="text-2xl font-bold font-mono text-purple-400">
                {isConnected ? sharesA : "--"}
              </p>
            </div>
            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col justify-center items-center">
              <p className="text-sm text-gray-400 mb-1">TKNB Liquidity Shares</p>
              <p className="text-2xl font-bold font-mono text-cyan-400">
                {isConnected ? sharesB : "--"}
              </p>
            </div>
          </div>
          <p className="text-xs text-center text-gray-500 mt-4">
            Estos valores son leídos en {`1 solo acceso a disco`} utilizando optimizaciones de Bitwise packing en el contrato inteligente.
          </p>
        </div>

        {/* SWAP WIDGET */}
        <div className="lg:col-span-2 relative p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-transparent">
          <div className="bg-gray-900/80 backdrop-blur-xl w-full h-full rounded-[23px] p-6 lg:p-8 flex flex-col justify-center min-h-[400px]">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-indigo-400">⚡</span> Swap Tokens
            </h2>

            <div className="flex justify-between items-center text-sm mb-4 bg-white/5 px-4 py-2 rounded-xl">
              <span className="text-gray-400">Current AMM Fee:</span>
              <span className={`${feePercentage === "0.30" ? "text-indigo-400" : "text-amber-400 animate-pulse font-bold"}`}>
                {feePercentage}% {feePercentage !== "0.30" && "(High Volatility)"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-gray-400">You Pay</p>
                  <p className="text-xs text-indigo-300">
                    Balance: {userBalanceIn ? Number(formatUnits(userBalanceIn as bigint, 18)).toFixed(2) : "0.00"}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent text-3xl outline-none w-[60%] font-medium"
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${isToken0ToToken1 ? 'from-blue-400 to-indigo-500' : 'from-teal-400 to-emerald-500'}`} />
                    <span>{symbolIn}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center -my-3 relative z-10 w-full">
                <button
                  onClick={() => setIsToken0ToToken1(!isToken0ToToken1)}
                  className="p-2 border-[4px] border-gray-900 bg-gray-800 rounded-xl hover:bg-gray-700 transition"
                >
                  ↓↑
                </button>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                <p className="text-sm text-gray-400 mb-2">You Receive (Est.)</p>
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    placeholder="Calculated on-chain..."
                    className="bg-transparent text-lg outline-none w-[60%] font-medium text-gray-500"
                    readOnly
                  />
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${!isToken0ToToken1 ? 'from-blue-400 to-indigo-500' : 'from-teal-400 to-emerald-500'}`} />
                    <span>{symbolOut}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={isPending || !amountIn || !isConnected}
              className="w-full py-4 mt-6 bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
            >
              {isPending ? "Processing..." : isConnected ? (amountIn ? "Swap" : "Enter an amount") : "Connect Wallet"}
            </button>
          </div>
        </div>

        {/* SIDE PANELS */}
        <div className="flex flex-col gap-6">

          {/* LIQUIDITY PANEL */}
          <div className="p-[1px] rounded-3xl bg-gradient-to-b from-white/10 to-transparent flex-1">
            <div className="bg-gray-900/80 backdrop-blur-xl w-full h-full rounded-[23px] p-6">
              <h3 className="text-lg font-semibold mb-4 text-emerald-400">💧 Pool Liquidity</h3>
              <div className="space-y-4">
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center text-sm">
                  <span className="text-gray-400">TKNA Reserve</span>
                  <span className="font-mono text-purple-300">{reserve0 ? Number(formatUnits(reserve0 as bigint, 18)).toFixed(2) : "0.00"}</span>
                </div>
                <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex justify-between items-center text-sm">
                  <span className="text-gray-400">TKNB Reserve</span>
                  <span className="font-mono text-cyan-300">{reserve1 ? Number(formatUnits(reserve1 as bigint, 18)).toFixed(2) : "0.00"}</span>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2 mt-4">
                  <input
                    type="number"
                    value={liqAmount0}
                    onChange={(e) => setLiqAmount0(e.target.value)}
                    placeholder="TKNA Amount"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-sm outline-none"
                  />
                  <input
                    type="number"
                    value={liqAmount1}
                    onChange={(e) => setLiqAmount1(e.target.value)}
                    placeholder="TKNB Amount"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-sm outline-none"
                  />
                  <button
                    onClick={handleAddLiquidity}
                    disabled={isPending || !liqAmount0 || !liqAmount1 || !isConnected}
                    className="w-full py-2.5 mt-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 disabled:bg-gray-800 disabled:text-gray-500 border border-emerald-500/30 rounded-xl text-sm font-medium transition-colors"
                  >
                    {isPending ? "Approving/Adding..." : "Add Liquidity"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* POINTS / REWARDS PANEL */}
          <div className="p-[1px] rounded-3xl bg-gradient-to-b from-amber-500/30 to-transparent flex-1 relative overflow-hidden">

            {/* Glow effect for rewards */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 blur-2xl rounded-full" />

            <div className="bg-gray-900/80 backdrop-blur-xl w-full h-full rounded-[23px] p-6 relative z-10">
              <h3 className="text-lg font-semibold mb-1 text-amber-400 flex items-center gap-2">
                🏆 My Points
              </h3>
              <p className="text-xs text-gray-400 mb-4">Earned from swaps (ERC-1155)</p>

              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-bold tracking-tight text-white">
                  {isConnected ? (pointsBalance ? Number(formatUnits(pointsBalance as bigint, 18)).toFixed(2) : "0.00") : "0.00"}
                </span>
                <span className="text-amber-500/80 font-medium mb-1">PTS</span>
              </div>

              <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-4">
                <div className="bg-gradient-to-r from-amber-500 to-yellow-300 h-full w-[45%]" />
              </div>
              <p className="text-xs mt-3 text-right flex justify-between">
                <span className="text-gray-500">Points multiplier active</span>
                <span className="text-amber-500/80 font-medium font-mono">Fee: {feePercentage}%</span>
              </p>

            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
