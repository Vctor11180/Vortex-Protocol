'use client'

import React from 'react'
import { EcosystemType } from './EVMMentor'

interface EcosystemSelectorProps {
  current: EcosystemType
  onChange: (eco: EcosystemType) => void
  compact?: boolean
}

export const EcosystemSelector: React.FC<EcosystemSelectorProps> = ({ current, onChange, compact = false }) => {
  return (
    <div className={`inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 shadow-inner backdrop-blur-md transition-all ${compact ? 'scale-90 sm:scale-100' : ''}`}>
      <button
        onClick={() => onChange('evm')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${
          current === 'evm'
            ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-[1.02]'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <span className="text-sm">💎</span>
        <span>Ethereum</span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase ${current === 'evm' ? 'bg-indigo-500/10 dark:bg-white/20 text-indigo-600 dark:text-white font-bold' : 'opacity-60'}`}>
          Sepolia
        </span>
      </button>

      <button
        onClick={() => onChange('stellar')}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black tracking-tight transition-all duration-300 ${
          current === 'stellar'
            ? 'bg-white dark:bg-cyan-600 text-slate-900 dark:text-white shadow-md dark:shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <span className="text-sm">🚀</span>
        <span>Stellar</span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase ${current === 'stellar' ? 'bg-cyan-500/10 dark:bg-white/20 text-cyan-600 dark:text-white font-bold' : 'opacity-60'}`}>
          Soroban
        </span>
      </button>
    </div>
  )
}
