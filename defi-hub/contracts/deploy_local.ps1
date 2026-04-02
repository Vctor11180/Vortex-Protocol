param(
    [string]$port      = "8546",
    [string]$pk        = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    [string]$deployer  = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    [string]$userWallet= ""
)

$rpc = "http://127.0.0.1:$port"

# --------------------------------------------------------
# Helpers
# --------------------------------------------------------
function Log-Step  { param($n,$t) Write-Host "`n[$n] $t" -ForegroundColor Cyan }
function Log-OK    { param($t)    Write-Host "    OK  $t" -ForegroundColor Green }
function Log-Fail  { param($t)    Write-Host "    ERR $t" -ForegroundColor Red }

function Get-Nonce {
    $raw = cast nonce $deployer --rpc-url $rpc 2>&1
    if ($raw -match "(\d+)") { return [int]$matches[1] }
    return 0
}

function Get-NextAddr {
    param([int]$atNonce)
    $raw = & cast compute-address $deployer --nonce $atNonce --rpc-url $rpc 2>&1
    $line = $raw | Where-Object { $_ -match "0x[a-fA-F0-9]{40}" } | Select-Object -First 1
    if ($line -match "0x[a-fA-F0-9]{40}") { return $matches[0] }
    return $null
}

function Deploy {
    param($label, $src, [string[]]$ctor = @())
    $n    = Get-Nonce
    $addr = Get-NextAddr $n
    Write-Host "    Deploying $label (nonce=$n, expected=$addr)..." -ForegroundColor DarkCyan
    if ($ctor.Count -gt 0) {
        $out = & forge create $src --rpc-url $rpc --private-key $pk --constructor-args @ctor 2>&1
    } else {
        $out = & forge create $src --rpc-url $rpc --private-key $pk 2>&1
    }
    if ($LASTEXITCODE -eq 0) {
        Log-OK "$label = $addr"
        return $addr
    }
    Log-Fail "$label failed"
    $out | Where-Object { $_ -notmatch "Warning|nightly|ABI|artifacts" } | Select-Object -First 5 | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkGray }
    return $null
}

function Send {
    param($label, $to, $sig, $a1, $a2)
    Write-Host "    -> $label" -ForegroundColor DarkCyan
    if ($PSBoundParameters.ContainsKey('a2')) {
        $out = & cast send $to $sig $a1 $a2 --rpc-url $rpc --private-key $pk 2>&1
    } elseif ($PSBoundParameters.ContainsKey('a1')) {
        $out = & cast send $to $sig $a1 --rpc-url $rpc --private-key $pk 2>&1
    } else {
        $out = & cast send $to $sig --rpc-url $rpc --private-key $pk 2>&1
    }
    if ($LASTEXITCODE -eq 0) { Log-OK $label }
    else {
        Log-Fail $label
        $out | Where-Object { $_ -notmatch "Warning|nightly" } | Select-Object -First 3 | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkGray }
    }
}

# --------------------------------------------------------
# INICIO
# --------------------------------------------------------
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  VORTEX PROTOCOL - DEPLOYMENT v3"            -ForegroundColor Cyan
Write-Host "  Anvil: localhost:$port  Chain: 31337"        -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Verificar Anvil
$pingBlock = & cast block-number --rpc-url $rpc 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Anvil no responde en puerto $port" -ForegroundColor Red
    Write-Host "Primero ejecuta en otra terminal:" -ForegroundColor Yellow
    Write-Host "  anvil --host 127.0.0.1 --port $port --base-fee 0 --gas-limit 100000000" -ForegroundColor Yellow
    exit 1
}
$startNonce = Get-Nonce
Write-Host "  Block: $pingBlock  |  Deployer nonce: $startNonce" -ForegroundColor DarkGray

# ---- PASO 1: Tokens ----
Log-Step "1/7" "ERC20 Tokens"
$token0 = Deploy "TKNA" "src/mocks/MockERC20.sol:MockERC20" @("TokenA", "TKNA")
$token1 = Deploy "TKNB" "src/mocks/MockERC20.sol:MockERC20" @("TokenB", "TKNB")
if (-not $token0 -or -not $token1) { Write-Host "`nABORTANDO." -ForegroundColor Red; exit 1 }

# ---- PASO 2: HookRegistry ----
Log-Step "2/7" "HookRegistry"
$registry = Deploy "HookRegistry" "src/HookRegistry.sol:HookRegistry"
if (-not $registry) { Write-Host "`nABORTANDO." -ForegroundColor Red; exit 1 }

# ---- PASO 3: Hooks ----
Log-Step "3/7" "Hooks"
$pointsHook     = Deploy "PointsHook"     "src/PointsHook.sol:PointsHook"
$dynamicFeeHook = Deploy "DynamicFeeHook" "src/DynamicFeeHook.sol:DynamicFeeHook"
if (-not $pointsHook -or -not $dynamicFeeHook) { Write-Host "`nABORTANDO." -ForegroundColor Red; exit 1 }

# ---- PASO 4: Register Hooks ----
Log-Step "4/7" "Register Hooks in Registry"
Send "updatePointsHook"     $registry "updatePointsHook(address)"     $pointsHook
Send "updateDynamicFeeHook" $registry "updateDynamicFeeHook(address)" $dynamicFeeHook

# ---- PASO 5: AMM ----
Log-Step "5/7" "AMM"
$amm = Deploy "AMM" "src/AMM.sol:AMM" @($token0, $token1, $registry)
if (-not $amm) { Write-Host "`nABORTANDO." -ForegroundColor Red; exit 1 }

# ---- PASO 6: Wiring ----
Log-Step "6/7" "Wire Hooks <-> AMM"
Send "PointsHook.setAmmAddress"     $pointsHook     "setAmmAddress(address)"     $amm
Send "DynamicFeeHook.setAmmAddress" $dynamicFeeHook "setAmmAddress(address)"     $amm
Send "PointsHook.setDynamicFeeHook" $pointsHook     "setDynamicFeeHook(address)" $dynamicFeeHook

# ---- PASO 7: Mint + Liquidity ----
Log-Step "7/7" "Mint Tokens + Add Liquidity"

$M1  = "1000000000000000000000000"  # 1,000,000 tokens
$k10 = "10000000000000000000000"    # 10,000 tokens
$MAX = "115792089237316195423570985008687907853269984665640564039457584007913129639935"

Send "Mint 1M TKNA -> deployer"  $token0 "mint(address,uint256)"     $deployer $M1
Send "Mint 1M TKNB -> deployer"  $token1 "mint(address,uint256)"     $deployer $M1
Send "Approve TKNA -> AMM"       $token0 "approve(address,uint256)"  $amm $MAX
Send "Approve TKNB -> AMM"       $token1 "approve(address,uint256)"  $amm $MAX
Send "addLiquidity(10k,10k)"     $amm    "addLiquidity(uint256,uint256)" $k10 $k10

# Token mint y GAS al wallet del usuario si se provee
if ($userWallet -ne "" -and $userWallet -match "0x[a-fA-F0-9]{40}") {
    Write-Host "`n    Minting tokens and SENDING GAS to user wallet: $userWallet" -ForegroundColor Yellow
    Send "Mint 10k TKNA -> user" $token0 "mint(address,uint256)" $userWallet $k10
    Send "Mint 10k TKNB -> user" $token1 "mint(address,uint256)" $userWallet $k10
    # Regalar 10 ETH para gas
    & cast send $userWallet --value 10ether --rpc-url $rpc --private-key $pk | Out-Null
    Log-OK "User gas & tokens funded!"
}

# ---- .env.local ----
$envLines = @(
    "NEXT_PUBLIC_CHAIN_ID=31337",
    "NEXT_PUBLIC_TOKEN0_ADDRESS=$token0",
    "NEXT_PUBLIC_TOKEN1_ADDRESS=$token1",
    "NEXT_PUBLIC_HOOK_REGISTRY_ADDRESS=$registry",
    "NEXT_PUBLIC_POINTS_HOOK_ADDRESS=$pointsHook",
    "NEXT_PUBLIC_DYNAMIC_HOOK_ADDRESS=$dynamicFeeHook",
    "NEXT_PUBLIC_AMM_ADDRESS=$amm"
)
$envLines | Set-Content "..\frontend\.env.local" -Encoding utf8

# ---- RESUMEN ----
Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT EXITOSO!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
$envLines | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "  SIGUIENTE PASO (MetaMask):" -ForegroundColor Yellow
Write-Host "  1. Agrega red -> RPC: http://127.0.0.1:$port  ChainID: 31337  Symbol: ETH"
Write-Host "  2. Importa clave Anvil: 0xac0974...2ff80  (tiene 10,000 ETH + 990k tokens)"
Write-Host "  3. Recarga localhost:3000"
Write-Host ""
