# # DeFi Hub - Ecosistema DeFi Avanzado (Edición Ronald)

Ecosistema DeFi construido como proyecto de un mes, integrando múltiples innovaciones de Finanzas Descentralizadas, incluyendo un Mini-DEX (AMM), Hooks de incentivos (ERC-1155), y Position Managers optimizados en **Assembly (Yul)**.

## Arquitectura del Proyecto

El proyecto está dividido en dos partes principales:
1. **Contratos Inteligentes (/contracts)**: Desarrollados y probados utilizando Foundry.
2. **Aplicación Frontend (/frontend)**: Interfaz de usuario construida con Next.js, React, Tailwind CSS y Wagmi/Viem.

---

## 1. Contratos Inteligentes

### AMM.sol (Automated Market Maker)
Un exchange descentralizado que utiliza la fórmula de producto constante $$x \cdot y = k$$.
- **Funcionalidad**: Permite añadir/remover liquidez y realizar swaps entre `token0` y `token1`.
- **Fee**: Fee estático inicial del 0.3%.

### PointsHook.sol (Incentivos ERC-1155)
Funciona como un "Hook" del AMM para emitir recompensas "POINTS" tras intercambios exitosos.

---

## 🚀 Cómo Ejecutar el Proyecto en mi PC (Instrucciones de Ronald)

Para volver a levantar todo, abre **TRES (3) terminales nuevas** en VS Code y sigue este orden:

### TERMINAL 1: Levantar la Blockchain Local (Anvil)
Inicia el nodo local de Ethereum (No cierres esta ventana):
```powershell
cd C:\PROGRAMACION\ETH2026Mini\Vortex-Protocol\defi-hub\contracts
C:\Users\ronal\.foundry\bin\anvil.exe --host 127.0.0.1
```
### Termianl 2 : Desplegar los contratos
Ejecuta el script para subir los contratos a tu red local:

cd C:\PROGRAMACION\ETH2026Mini\Vortex-Protocol\defi-hub\contracts
C:\Users\ronal\.foundry\bin\forge.exe script script/Deploy.s.sol:DeployScript --rpc-url [http://127.0.0.1:8545](http://127.0.0.1:8545) --broadcast

Nota para Ronald: Si los balances en la web salen en 0.00, copia las direcciones que salen aquí y actualiza el archivo de configuración del frontend.


### TERMINAL 3: Levantar la página Web (Frontend)
Inicia el servidor de Next.js:
cd C:\PROGRAMACION\ETH2026Mini\Vortex-Protocol\defi-hub\frontend
npm run dev

```powershell
