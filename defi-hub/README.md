# DeFi Hub - Vortex Protocol (Versión Modular & IA)

Ecosistema DeFi avanzado: AMM, Hooks de incentivos (ERC-1155), **Hook Registry (Modularidad)** y **EVM Mentor (IA Educativa)**.

## 🧱 Arquitectura Modular
- **Hook Registry**: Permite actualizar hooks sin migrar liquidez del pool.
- **EVM Mentor**: IA que explica las transacciones en tiempo real al usuario.
- **Dynamic Fee Hook**: Ajusta comisiones según la volatilidad del mercado.

---

## 📋 Requisitos Previos — Solución de Errores

Si ves `"forge" no se reconoce` o `"npm" no se reconoce`, ejecuta esto **una sola vez** en PowerShell:

```powershell
# Instalar Foundry y arreglar PATH
$dir="$HOME\.foundry\bin"
if(!(Test-Path $dir)){ New-Item -ItemType Directory -Force -Path $dir }
curl.exe -L "https://github.com/foundry-rs/foundry/releases/download/nightly/foundry_nightly_win32_amd64.tar.gz" -o "$dir\foundry.tar.gz"
tar.exe -xf "$dir\foundry.tar.gz" -C $dir
Remove-Item "$dir\foundry.tar.gz"
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($oldPath -notlike "*foundry*") {
    [Environment]::SetEnvironmentVariable("Path", "$oldPath;C:\Program Files\nodejs\;$dir", "User")
}
Write-Host "LISTO. Cierra y vuelve a abrir VS Code." -ForegroundColor Green
```

---

## 🚀 Cómo Ejecutar el Proyecto

> ⚠️ **IMPORTANTE**: La carpeta raíz del repo es `VortexProtocol\Vortex-Protocol\defi-hub\`.
> Todos los comandos usan la ruta **completa** para evitar errores.

Abre **3 terminales de PowerShell** en VS Code y sigue este orden:

---

### 🏁 TERMINAL 1 — Nodo Blockchain Local (Anvil)

```powershell
cd C:\Users\usuario\Desktop\descargas\VortexProtocol\Vortex-Protocol\defi-hub\contracts
anvil --host 127.0.0.1 --port 8546 --base-fee 0 --gas-limit 100000000
```

> Deja esta terminal abierta. Si ves `"Error: puerto en uso"`, Anvil ya está corriendo — no necesitas abrirlo de nuevo.

---

### 🔨 TERMINAL 2 — Despliegue de Contratos

```powershell
cd C:\Users\usuario\Desktop\descargas\VortexProtocol\Vortex-Protocol\defi-hub\contracts
# Reemplaza 0xTU_BILLETERA por tu dirección (ej: 0x4f30...71f4) para recibir 10k tokens de regalo
powershell -ExecutionPolicy Bypass -File .\deploy_local.ps1 -port 8546 -userWallet 0xTU_BILLETERA
```

Este script despliega automáticamente en orden:
`TKNA → TKNB → HookRegistry → PointsHook → DynamicFeeHook → AMM → Liquidez inicial`

> **Pro-Tip**: Si usas una billetera importada (que no sea de Anvil), el script también te enviará **ETH de regalo** para que tengas gas para operar.

---

### 🌐 TERMINAL 3 — Interfaz Web (Frontend)

**Espera a que el Terminal 2 termine** y luego ejecuta:

```powershell
cd C:\Users\usuario\Desktop\descargas\VortexProtocol\Vortex-Protocol\defi-hub\frontend
# Matar procesos viejos y arrancar limpio
taskkill /F /IM node.exe
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

### 🦊 Configuración de MetaMask (CRÍTICO)

1. **Red Anvil**:
| Campo | Valor |
|---|---|
| Nombre de red | Vortex Local |
| URL RPC | **`http://127.0.0.1:8546`** (Debe incluir http://) |
| Chain ID | `31337` |
| Símbolo | ETH / GO |

2. **Solución a transacciones trabadas (SIEMPRE HACER ESTO AL REINICIAR)**:
Si los balances salen en 0.00 o las transacciones fallan:
- Ve a MetaMask > Clic en icono de cuenta > **Configuración** > **Avanzado**.
- Clic en **"Borrar datos de actividad de pestañas"** (o "Reiniciar cuenta").
- Refresca la web con F5.

---

## Estructura del Proyecto

```
defi-hub/
├── contracts/          # Smart Contracts (Foundry)
│   ├── src/            # AMM, HookRegistry, PointsHook, DynamicFeeHook
│   ├── script/         # Deploy.s.sol
│   └── deploy_local.ps1  # Script de despliegue local (workaround)
└── frontend/           # Next.js + Wagmi/Viem + EVM Mentor (IA)
```
