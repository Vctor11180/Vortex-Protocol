'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { EVMMentor, EcosystemType } from '../components/EVMMentor'
import { EcosystemSelector } from '../components/EcosystemSelector'

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [ecosystem, setEcosystem] = useState<EcosystemType>('evm')

  useEffect(() => {
    setMounted(true)
    const savedTheme = (localStorage.getItem('vortex-theme') as 'light' | 'dark') || 'dark'
    setTheme(savedTheme)
    const savedEco = (localStorage.getItem('vortex-ecosystem') as EcosystemType) || 'evm'
    setEcosystem(savedEco)
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

  if (!mounted) return null

  const isStellar = ecosystem === 'stellar'

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans relative selection:bg-indigo-500/30 transition-colors duration-500">
      <style jsx global>{`
        :root {
          --background: #fcfcfd;
          --foreground: #0f172a;
          --card: rgba(255, 255, 255, 0.9);
          --border: rgba(15, 23, 42, 0.2);
          --accent: #4f46e5;
        }
        .dark {
          --background: #0a0f1c;
          --foreground: #f8fafc;
          --card: rgba(30, 41, 59, 0.5);
          --border: rgba(255, 255, 255, 0.1);
        }
      `}</style>
      
      {/* Background Orbs */}
      <div className={`absolute top-[-10%] left-[-5%] w-[600px] h-[600px] ${isStellar ? 'bg-cyan-600/10 dark:bg-cyan-600/10' : 'bg-indigo-600/10 dark:bg-indigo-600/5'} rounded-full blur-[120px] mix-blend-screen dark:mix-blend-normal animate-pulse transition-all duration-700`} />
      <div className={`absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] ${isStellar ? 'bg-blue-600/10 dark:bg-blue-600/10' : 'bg-purple-600/10 dark:bg-purple-600/5'} rounded-full blur-[140px] mix-blend-screen dark:mix-blend-normal animate-pulse [animation-delay:2s] transition-all duration-700`} />

      {/* Header / Logo */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap gap-4 justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${isStellar ? 'from-cyan-500 to-blue-600 shadow-cyan-500/20' : 'from-indigo-500 to-violet-600 shadow-indigo-500/20'} flex items-center justify-center shadow-lg transition-all`}>
            <span className="text-xl">{isStellar ? '🚀' : '🌪️'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter leading-none">Vortex</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">Multichain Academy</span>
          </div>
        </div>
        
        {/* Network & Theme Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <EcosystemSelector current={ecosystem} onChange={handleEcosystemChange} />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl border border-v-border flex items-center justify-center bg-v-card hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-90"
            title="Toggle Theme"
          >
            {theme === 'light' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

          <Link 
            href="/swap"
            className={`px-5 py-2.5 ${isStellar ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-900 text-white dark:bg-v-card dark:text-white dark:hover:bg-white/10'} border border-slate-900 dark:border-v-border rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-indigo-500/10`}
          >
            Enter {isStellar ? 'Soroban' : 'EVM'} DEX
          </Link>
        </div>
      </nav>

      {/* Main Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-32 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <span className={`w-2 h-2 rounded-full ${isStellar ? 'bg-cyan-400' : 'bg-indigo-500'} animate-ping`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              {isStellar ? 'Stellar Testnet • Soroban Rust Engine' : 'Ethereum • Sepolia Testnet Live'}
            </span>
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-black leading-[1.1] tracking-tight text-slate-950 dark:text-white">
            Finanzas <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isStellar ? 'from-cyan-400 via-sky-500 to-blue-500' : 'from-indigo-500 via-purple-500 to-pink-500'}`}>
              {isStellar ? 'Soroban & Rust' : 'Programables'}
            </span> <br />
            {isStellar ? 'en Stellar.' : 'y Resilientes.'}
          </h1>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
            {isStellar ? (
              <>
                Vortex amplía su frontera a <strong className="text-slate-900 dark:text-white">Stellar</strong>: Smart Contracts en WebAssembly con comisiones fijas de <strong className="text-slate-900 dark:text-white">0.00001 XLM</strong> y un mentor que te enseña la arquitectura de Soroban en tiempo real.
              </>
            ) : (
              <>
                Vortex no es solo un DEX. Es un ecosistema educativo impulsado por <strong className="text-slate-900 dark:text-white">Hooks de Liquidez</strong> y un <strong className="text-slate-900 dark:text-white">Mentor IA</strong> que te guía en cada paso de la blockchain.
              </>
            )}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link 
              href="/swap"
              className={`px-8 py-4 ${isStellar ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-900/90 dark:hover:bg-indigo-50'} rounded-2xl font-black text-lg shadow-xl dark:shadow-2xl transition-all hover:-translate-y-1 text-center`}
            >
              Comenzar a Operar ({isStellar ? 'Stellar' : 'Sepolia'})
            </Link>
            <div className="p-[1px] rounded-2xl bg-slate-200 dark:bg-gradient-to-r dark:from-white/20 dark:to-transparent">
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full px-8 py-4 bg-white dark:bg-[#0a0f1c] hover:bg-slate-50 dark:hover:bg-white/5 rounded-[15px] font-bold text-lg transition-colors text-slate-900 dark:text-white border border-slate-300 dark:border-transparent shadow-sm"
              >
                Conocer al Mentor
              </button>
            </div>
          </div>
        </div>

        {/* Visual Showcase - El Mentor reactivo */}
        <div className="relative">
          <div className={`absolute -inset-4 bg-gradient-to-r ${isStellar ? 'from-cyan-500/20 to-blue-500/20' : 'from-indigo-500/20 to-purple-500/20'} rounded-[3rem] blur-3xl`} />
          <div className="relative scale-110 lg:scale-125 transform transition-transform hover:rotate-1">
            <EVMMentor 
              currentFeeBps={isStellar ? 5 : 30}
              pointsBalance={BigInt(0)}
              isPending={false}
              ecosystem={ecosystem}
            />
          </div>
          {/* Badge Decorativa */}
          <div className="absolute -top-12 -right-6 bg-white dark:bg-v-card border border-slate-300 dark:border-v-border p-4 rounded-2xl shadow-2xl backdrop-blur-3xl animate-bounce [animation-duration:4s] z-20">
             <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${isStellar ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'} flex items-center justify-center border font-bold`}>✓</div>
                <p className="text-xs font-bold uppercase tracking-tighter text-slate-900 dark:text-white">
                  {isStellar ? 'Soroban WASM Verified' : 'Security Verified by Hooks'}
                </p>
             </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-28 border-t border-v-border">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Arquitectura Multichain de Aprendizaje</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Diseñado para educar y operar en dos filosofías de blockchain completamente distintas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="group space-y-4 p-8 rounded-[2rem] bg-v-card border border-v-border shadow-sm hover:border-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
            <div className="text-3xl">💎</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">EVM & Hooks v4</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-pretty">
              Contratos en Solidity con HookRegistry, fees dinámicos ante volatilidad y gamificación en ERC-1155 desplegados en Sepolia.
            </p>
          </div>
          <div className="group space-y-4 p-8 rounded-[2rem] bg-v-card border border-v-border shadow-sm hover:border-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/5">
            <div className="text-3xl">🚀</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Stellar & Soroban</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-pretty">
              Smart Contracts escritos en Rust y compilados a WebAssembly. Almacenamiento eficiente con expiración TTL y micro-fees de 0.00001 XLM.
            </p>
          </div>
          <div className="group space-y-4 p-8 rounded-[2rem] bg-v-card border border-v-border shadow-sm hover:border-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/5">
            <div className="text-3xl">🐢</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ajolote Sabio (Mentor IA)</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed text-pretty">
              Te explica qué está pasando en tu transacción en tiempo real, comparando la mecánica de Ethereum y Stellar mientras operas.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Basic */}
      <footer className="py-12 border-t border-v-border text-center text-slate-500 dark:text-slate-600 text-sm">
        Vortex Protocol © 2026 • Multichain Educational DeFi • Sepolia & Stellar Testnet
      </footer>

    </div>
  )
}
