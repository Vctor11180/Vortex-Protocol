import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Configuración para la red Sepolia (Chain ID: 11155111)
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [sepolia.id]: http(),
  },
})

