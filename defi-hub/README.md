# DeFi Hub - Ecosistema DeFi Avanzado

Ecosistema DeFi construido como proyecto de un mes, integrando múltiples innovaciones de Finanzas Descentralizadas, incluyendo un Mini-DEX (AMM), Hooks de incentivos (ERC-1155), y preparación para Fees dinámicos y Position Managers optimizados.

## Arquitectura del Proyecto

El proyecto está dividido en dos partes principales:
1. **Contratos Inteligentes (`/contracts`)**: Desarrollados y probados utilizando Foundry.
2. **Aplicación Frontend (`/frontend`)**: Interfaz de usuario construida con Next.js, React, Tailwind CSS y Wagmi/Viem para la interacción con la blockchain.

---

## 1. Contratos Inteligentes (Semana 1)

### AMM.sol (Automated Market Maker)
Un exchange descentralizado básico que utiliza la fórmula de producto constante ($x * y = k$).
- **Funcionalidad**: Permite a los usuarios añadir liquidez, remover liquidez y realizar swaps entre dos tokens ERC20 (`token0` y `token1`).
- **Fee**: Un fee estático inicial del 0.3% en swaps.

### PointsHook.sol (Hook de Incentivos Constantes)
Un contrato de Token ERC-1155 diseñado para funcionar como un "Hook" del AMM.
- **Funcionalidad**: Emite recompesas "POINTS" (Token ID 1) a los usuarios proporcionalmente al volumen intercambiado.
- **Integración**: El AMM llama a la función `afterSwap()` del Hook cada vez que se completa un intercambio de tokens de manera exitosa.

---

## 2. Frontend (En desarrollo)

### Stack Tecnológico
- **Framework**: Next.js (App Router)
- **Estilos**: Tailwind CSS
- **Interacción Web3**: `wagmi`, `viem` y `@tanstack/react-query`

### Conexión de Wallets
El frontend implementa la abstracción de `wagmi` para permitir una conexión de billeteras robusta y moderna. 

---

## 🚀 Cómo Ejecutar el Proyecto Localmente (Instrucciones Exactas)

Si cierras la terminal (PowerShell, CMD o VS Code), necesitarás abrir **TRES (3) terminales nuevas** y correr cada uno de estos bloques de código paso a paso. 

📝 **Importante:** Asegúrate de que las rutas que usas apuntan internamente a `defi-hub/contracts` o `defi-hub/frontend`. Los comandos de `npm` y `forge` no funcionan en la carpeta raíz `Foundri`.

### TERMINAL 1: Levantar la Blockchain Local (Anvil)
Abre una terminal y copia esto (no la cierres):
```powershell
cd d:\PROYECTOS\Foundri\defi-hub\contracts
C:\Users\Victorcito\.foundry\bin\anvil.exe --host 127.0.0.1
```

### TERMINAL 2: Desplegar los contratos en tu red local
Abre **otra** terminal y copia esto para desplegar el código en el nodo local que acabas de encender:
```powershell
cd d:\PROYECTOS\Foundri\defi-hub\contracts
C:\Users\Victorcito\.foundry\bin\forge.exe script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

### TERMINAL 3: Levantar la página Web (Frontend)
Abre **una tercera** terminal y ejecuta lo siguiente para iniciar el servidor de Next.js:
```powershell
cd d:\PROYECTOS\Foundri\defi-hub\frontend
npm run dev
```

Una vez que diga `Ready in ...`, abre en tu navegador: **http://localhost:3000**

---
*Documentación en progreso - Actualizado Día 7.*
