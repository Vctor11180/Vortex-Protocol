'use client'

import React, { useState, useEffect } from 'react'

interface EVMMentorProps {
  currentFeeBps: number | undefined
  pointsBalance: bigint | undefined
  isPending: boolean
  lastTxStatus?: 'success' | 'error' | null
}

export const EVMMentor: React.FC<EVMMentorProps> = ({ 
  currentFeeBps, 
  pointsBalance, 
  isPending,
  lastTxStatus 
}) => {
  const [analysisText, setAnalysisText] = useState('Analizando red...')
  const [isTyping, setIsTyping] = useState(false)

  const feeBase = 30 // BASE_FEE en el contrato es 0.3%
  const feeCurrent = currentFeeBps ?? 30
  const points = pointsBalance ? Number(pointsBalance) / 1e18 : 0

  useEffect(() => {
    let text = ''
    if (isPending) {
      text = 'Detectando transacción entrante... Verificando simulación en EVM para optimizar gas y slippage.'
    } else if (feeCurrent > feeBase) {
        text = `Alerta de Volatilidad: El volumen del pool ha subido, incrementando la comisión a ${(feeCurrent/100).toFixed(2)}%. Consejo: Espera unos minutos para que el volumen decaiga o usa tus puntos de lealtad.`
    } else if (points > 10) {
        text = 'Status de Usuario Leal detectado. Tienes suficientes puntos para activar un descuento del 50% en tu próximo swap.'
    } else {
        text = 'Protocolo en estado óptimo. Las condiciones de liquidez son estables para un swap de bajo impacto.'
    }

    setIsTyping(true)
    setAnalysisText(text)
    
    const timeout = setTimeout(() => setIsTyping(false), 2000)
    return () => clearTimeout(timeout)
  }, [currentFeeBps, isPending, points])

  return (
    <div className="relative group transition-all duration-500">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-3xl shadow-xl overflow-hidden">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-xl animate-pulse">🧠</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0f162c] animate-bounce"></div>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">EVM Mentor</h3>
            <div className="flex items-center gap-1.5">
               <span className="flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
               <span className="text-[10px] font-bold text-green-600 dark:text-green-400">ANALITYCAL MODE ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="min-h-[80px] bg-slate-50 dark:bg-black/30 rounded-2xl p-4 border border-slate-100 dark:border-white/5 relative">
          <p className="text-xs sm:text-sm text-slate-600 dark:text-indigo-100/80 leading-relaxed font-medium italic">
            "{analysisText}"
          </p>
          {isTyping && (
            <div className="absolute bottom-2 right-4 flex gap-1">
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500/10 transition-colors">
            <p className="text-[9px] text-slate-500 dark:text-gray-500 uppercase font-bold mb-1">Impacto Estimado</p>
            <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">&lt; 0.01% Price Impact</p>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors">
            <p className="text-[9px] text-slate-500 dark:text-gray-500 uppercase font-bold mb-1">Sugerencia</p>
            <p className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">HODL & Accumulate</p>
          </div>
        </div>

        <button className="w-full mt-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-white/10 dark:to-white/5 hover:from-slate-800 hover:to-slate-700 dark:hover:from-white/20 dark:hover:to-white/10 text-white dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 dark:border-white/10">
          Ask Custom Question (LLM Beta)
        </button>
      </div>
    </div>
  )
}
