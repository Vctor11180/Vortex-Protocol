# DeFi Hub - Vortex Protocol (Sepolia Live) 🌪️

Ecosistema DeFi avanzado desplegado en la red de prueba **Sepolia**. Vortex combina un AMM modular con la potencia de la Inteligencia Artificial (EVM Mentor) para educar a los usuarios en tiempo real.

> [!TIP]
> Esta es la versión final optimizada. Para ver la historia del desarrollo local y el aprendizaje con Anvil, consulta el [📜 Manual de Legado](./README_LEGACY.md).

---

## 🏆 Hitos del Proyecto
1. **Fase Génesis**: Desarrollo de la lógica modular y AMM en entorno local (Anvil).
2. **Mentalidad de IA**: Integración del EVM Mentor para democratizar el conocimiento DeFi.
3. **Salto a la Red Real**: Migración exitosa a **Sepolia Testnet**, logrando persistencia de datos y estabilidad profesional.

---

## 🚀 Inicio Rápido (Modo Eficiente)

Ya no necesitas configurar nodos locales ni desplegar contratos. El protocolo está **Live** y listo para usar.

### 🌐 Único Paso — Interfaz Web
Abre una terminal de PowerShell en la raíz del proyecto y ejecuta:

```powershell
# Ir directamente a la carpeta del frontend
cd Vortex-Protocol/defi-hub/frontend
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🦊 Configuración de MetaMask

Conecta tu billetera (se recomienda la cuenta de demo `0x4f30...71f4`) a la red oficial de pruebas:

| Campo | Valor |
|---|---|
| Red | **Sepolia Test Network** |
| Chain ID | `11155111` |
| Símbolo | SepoliaETH |

### 💎 Direcciones del Protocolo (Sepolia)
- **Token A (TKNA)**: `0xba4164f1829b8e1eef0f78b6aee517d8fdac34ee`
- **Token B (TKNB)**: `0x7ba20dcd66d3ea1f8e2f56a25ba8db58aee6735e`
- **AMM Principal**: `0x33e5adf857f02c5e56174c99b610c86e04610a6d`

---

## 🧠 Características Principales
- **EVM Mentor**: Detecta volátiles y explica cambios en las comisiones automáticamente.
- **Loyalty Points**: Gana tokens ERC-1155 por cada swap exitoso.
- **Modularidad**: Hooks dinámicos que ajustan el comportamiento del pool sin pausar el protocolo.

---

## 📁 Estructura
```
defi-hub/
├── contracts/          # Código fuente de los Smart Contracts (Foundry)
├── frontend/           # Aplicación Next.js + IA Mentor
└── README_LEGACY.md    # Registro histórico del desarrollo local
```
