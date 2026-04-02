# deploy_sepolia.ps1
# Carga variables de .env y ejecuta forge

if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^(?<key>[^#\s][^=]+)=(?<value>.*)$") {
            $key = $Matches['key'].Trim()
            $value = $Matches['value'].Trim()
            # Remove quotes if present
            $value = $value -replace '^["'']|["'']$', ''
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "Cargada variable: $key" -ForegroundColor Gray
        }
    }
} else {
    Write-Error "No se encontró el archivo .env en el directorio actual."
    exit 1
}

if (-not $env:RPC_URL) {
    Write-Error "RPC_URL no definida en .env"
    exit 1
}

if (-not $env:PRIVATE_KEY) {
    Write-Error "PRIVATE_KEY no definida en .env"
    exit 1
}

Write-Host "Iniciando despliegue de Vortex Protocol en Sepolia..." -ForegroundColor Cyan
forge script script/Deploy.s.sol:DeployScript --rpc-url $env:RPC_URL --broadcast --verify --etherscan-api-key $env:ETHERSCAN_API_KEY -vvvv
