'use client'

import React, { useState, useEffect, useRef } from 'react'

interface EVMMentorProps {
  currentFeeBps: number | undefined
  pointsBalance: bigint | undefined
  isPending: boolean
  lastTxStatus?: 'success' | 'error' | null
  activeSection?: 'swap' | 'liquidity' | 'rewards' | 'available-rewards' | 'protocol-reserves' | 'tkna' | 'tknb' | 'none'
  isTypingInput?: boolean
}

export const EVMMentor: React.FC<EVMMentorProps> = ({ 
  currentFeeBps, 
  pointsBalance, 
  isPending,
  lastTxStatus,
  activeSection = 'none',
  isTypingInput = false
}) => {
  const [analysisText, setAnalysisText] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 })
  const axolotlRef = useRef<HTMLDivElement>(null)

  const feeBase = 30 // BASE_FEE
  const feeCurrent = currentFeeBps ?? 30
  const points = pointsBalance ? Number(pointsBalance) / 1e18 : 0

  // Determinar color de estado
  let statusColor = 'bg-green-500'
  let glowColor = 'from-green-500/20 to-emerald-500/20'
  if (isPending) {
    statusColor = 'bg-purple-500'
    glowColor = 'from-purple-500/20 to-fuchsia-500/20'
  } else if (feeCurrent > feeBase) {
    statusColor = 'bg-amber-500'
    glowColor = 'from-amber-500/20 to-orange-500/20'
  }

  // Hook para seguir el cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!axolotlRef.current) return
      const rect = axolotlRef.current.getBoundingClientRect()
      
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
      // Ajustar la distancia máxima de las pupilas (3 px max)
      const distance = Math.min(3, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 50)
      
      setEyePos({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Lógica principal de análisis REACTIVA
  useEffect(() => {
    let newText = ''
    
    // Prioridad 1: Transacciones pendientes
    if (isPending) {
      newText = 'Transacción en camino... La EVM (el cerebro de Ethereum) está procesando tus datos en Sepolia. ¡Casi listo!'
    } 
    // Prioridad 2: Interacción activa (Typing)
    else if (isTypingInput) {
      if (activeSection === 'swap') {
        newText = 'Calculando Slippage... Es la diferencia entre el precio que ves y el que obtienes. ¡Vortex lo mantiene bajo!'
      } else {
        newText = 'Estás por aportar liquidez. Esto ayuda al protocolo a ser más fuerte. ¡Gran decisión!'
      }
    }
    // Prioridad 3: Contexto de Sección
    else if (activeSection === 'liquidity') {
      newText = 'Aquí gestionas tus fondos en el Pool. Consejo: Para retirar, usa el botón de "Withdraw" cuando lo necesites.'
    }
    else if (activeSection === 'rewards') {
      newText = '¡Tus puntos de lealtad! Son tokens ERC-1155 que ganas por operar. No consumen gas al acumularse.'
    }
    else if (activeSection === 'available-rewards') {
      newText = 'El Mercado de Vortex. Aquí canjeas tu experiencia por beneficios reales como descuentos en comisiones.'
    }
    else if (activeSection === 'protocol-reserves') {
      newText = 'Estas son las reservas totales del pool. Una liquidez alta permite swaps más grandes con menos impacto en el precio.'
    }
    else if (activeSection === 'tkna') {
      newText = 'TKNA es el Token A. Los AMM usan proporciones matemáticas entre el Token A y el B para fijar precios automáticamente.'
    }
    else if (activeSection === 'tknb') {
      newText = 'TKNB es el Token B. Si la reserva de B baja mucho, su valor subirá respecto a A para incentivar el equilibrio.'
    }
    else if (feeCurrent > feeBase) {
      newText = `¡Alerta de Volatilidad! El volumen del pool subió, incrementando el fee a ${(feeCurrent/100).toFixed(2)}%. Mejor espera un poco.`
    } else if (points > 10) {
      newText = '¡Huelo un Usuario Leal! Tienes puntos suficientes para reclamar un descuento en tu próximo movimiento.'
    } else {
      newText = 'Sistema estable. Soy tu Mentor EVM, estoy aquí para explicarte cómo funciona la liquidez programable.'
    }
    
    setAnalysisText(newText)
  }, [currentFeeBps, isPending, points, activeSection, isTypingInput])

  // Efecto Typewriter
  useEffect(() => {
    let currentIdx = 0
    setDisplayText('')
    setIsTyping(true)

    const intervalId = setInterval(() => {
      setDisplayText(analysisText.slice(0, currentIdx + 1))
      currentIdx++
      if (currentIdx >= analysisText.length) {
        clearInterval(intervalId)
        setTimeout(() => setIsTyping(false), 500)
      }
    }, 20) // Un poco más rápido para fluidez

    return () => clearInterval(intervalId)
  }, [analysisText])

  const handleChipClick = (topic: string) => {
    if (topic === 'amm') {
      setAnalysisText('AMM significa Automated Market Maker. Es un robot matemático que permite cambiar tokens sin necesidad de un banco.')
    } else if (topic === 'evm') {
      setAnalysisText('EVM es la Ethereum Virtual Machine. Es como una computadora gigante mundial que ejecuta tus contratos de forma segura.')
    } else if (topic === 'retiro') {
      setAnalysisText('¿Quieres salir? Solo ve a Liquidity, indica cuánto quieres retirar y confirma. Tus tokens volverán a tu billetera al instante.')
    }
  }

  return (
    <div className="relative group transition-all duration-500">
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${glowColor} rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-1000`}></div>
      <div className="relative bg-v-card border border-v-border p-6 rounded-[2rem] backdrop-blur-3xl shadow-xl overflow-hidden flex flex-col items-center">
        
        {/* Header Compacto */}
        <div className="w-full flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColor} ${isPending ? 'animate-ping' : ''}`}></span>
              EVM Mentor
            </h3>
            <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 mt-1 inline-block ${statusColor.replace('bg-', 'text- border-').replace('500', '400/50')}`}>
               {isPending ? 'PROCESSING...' : 
                activeSection === 'swap' ? 'SWAP MODE' : 
                activeSection === 'liquidity' ? 'LIQUIDITY MODE' :
                activeSection === 'rewards' ? 'REWARDS MODE' :
                activeSection === 'available-rewards' ? 'MARKET MODE' :
                activeSection === 'protocol-reserves' ? 'RESERVES MODE' :
                activeSection === 'tkna' ? 'TOKEN A INFO' :
                activeSection === 'tknb' ? 'TOKEN B INFO' :
                'ACADEMY ACTIVE'}
            </span>
          </div>
        </div>

        {/* Avatar SVG del Ajolote Sabio */}
        <div ref={axolotlRef} className="w-28 h-28 relative mb-3 flex items-center justify-center transition-transform duration-300 hover:scale-[1.03] cursor-pointer">
           <div className={`absolute inset-0 rounded-full blur-xl opacity-40 bg-gradient-to-b ${glowColor} dark:opacity-50`}></div>
           
           <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl z-10" overflow="visible">
              {/* Branquias / Cuernos dinámicos */}
              <g className={`transition-all duration-700 ease-in-out ${isPending ? 'fill-purple-400 dark:fill-purple-500' : feeCurrent > feeBase ? 'fill-orange-400 dark:fill-orange-500' : 'fill-cyan-400 dark:fill-cyan-500'}`}>
                {/* Izquierda */}
                <path d="M22 45 C10 40 5 25 15 20 C20 18 28 35 32 40 Z" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <path d="M20 55 C5 50 0 40 10 32 C15 30 25 45 28 50 Z" />
                <path d="M25 65 C10 65 5 55 15 50 C20 48 30 55 32 60 Z" className="animate-[pulse_2.5s_ease-in-out_infinite]" />
                {/* Derecha */}
                <path d="M78 45 C90 40 95 25 85 20 C80 18 72 35 68 40 Z" className="animate-[pulse_3s_ease-in-out_infinite]" />
                <path d="M80 55 C95 50 100 40 90 32 C85 30 75 45 72 50 Z" />
                <path d="M75 65 C90 65 95 55 85 50 C80 48 70 55 68 60 Z" className="animate-[pulse_2.5s_ease-in-out_infinite]" />
              </g>

              {/* Cabeza (Pink suave) */}
              <ellipse cx="50" cy="55" rx="32" ry="25" className="fill-pink-200 dark:fill-[#ffb3d9]" />
              
              {/* Expresión Facial Dinámica (Boca) */}
              <path 
                d={isPending ? "M 45 66 Q 50 70 55 66 Q 50 62 45 66" : isTypingInput ? "M 46 66 L 54 66" : "M 42 65 Q 50 71 58 65"} 
                fill={isPending ? "#e673a1" : "none"} 
                stroke="#e673a1" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                className="transition-all duration-300"
              />

              {/* Montura Gafas (Sabiduría) */}
              <g className="stroke-indigo-600 dark:stroke-indigo-400" fill="none" strokeWidth="2.5">
                <rect x="28" y="46" width="16" height="12" rx="4" fill="rgba(99, 102, 241, 0.15)" />
                <rect x="56" y="46" width="16" height="12" rx="4" fill="rgba(99, 102, 241, 0.15)" />
                <path d="M 44 52 L 56 52" />
              </g>

              {/* Pupilas Móviles y Dinámicas */}
              <g className="fill-slate-900 dark:fill-black transition-all duration-200">
                {/* Izquierda */}
                <circle cx={36 + eyePos.x} cy={52 + eyePos.y} r={isTypingInput ? "1.8" : "2.5"} />
                <circle cx={35 + eyePos.x} cy={51 + eyePos.y} r={isTypingInput ? "0.6" : "0.8"} fill="white" />
                {/* Derecha */}
                <circle cx={64 + eyePos.x} cy={52 + eyePos.y} r={isTypingInput ? "1.8" : "2.5"} />
                <circle cx={63 + eyePos.x} cy={51 + eyePos.y} r={isTypingInput ? "0.6" : "0.8"} fill="white" />
              </g>

              {/* Rubor */}
              <ellipse cx="32" cy="61" rx="4" ry="2" className="fill-pink-300 dark:fill-pink-400 opacity-70" />
              <ellipse cx="68" cy="61" rx="4" ry="2" className="fill-pink-300 dark:fill-pink-400 opacity-70" />
           </svg>
        </div>

        {/* Burbuja de Texto Typewriter */}
        <div className="w-full min-h-[90px] bg-slate-100/90 dark:bg-[#0f162c]/80 rounded-3xl p-5 border border-slate-300 dark:border-white/10 relative shadow-md dark:shadow-inner flex items-center transition-all mt-4">
          {/* Puntero de la burbuja (apuntando al ajolote superior) */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-100/90 dark:bg-[#0f162c]/80 border-t border-l border-slate-300 dark:border-white/10 rotate-45"></div>
          <p className="text-sm text-slate-800 dark:text-indigo-100/90 leading-relaxed font-bold relative z-10 w-full text-center">
            {displayText}
            {isTyping && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-indigo-500 animate-pulse"></span>}
          </p>
        </div>

        {/* Glosario y Ayuda Interactiva */}
        <div className="w-full mt-5 flex flex-wrap justify-center gap-2 pb-2">
           <button onClick={() => handleChipClick('amm')} className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-indigo-500/20 active:scale-95 shadow-sm">
             ❓ ¿Qué es AMM?
           </button>
           <button onClick={() => handleChipClick('evm')} className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-purple-500/20 active:scale-95 shadow-sm">
             🧠 ¿Qué es EVM?
           </button>
           <button onClick={() => handleChipClick('retiro')} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border border-emerald-500/20 active:scale-95 shadow-sm">
             🚪 ¿Cómo retiro?
           </button>
        </div>

      </div>
    </div>
  )
}
