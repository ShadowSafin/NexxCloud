[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $RootDir ".env"

function Write-NexxCloudInfo([string] $Message) {
    Write-Host "[NexxCloud] $Message" -ForegroundColor Cyan
}

function Throw-NexxCloudError([string] $Message) {
    throw "[NexxCloud] $Message"
}

function New-SecureHex {
    $bytes = New-Object byte[] 32
    $provider = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $provider.GetBytes($bytes)
    } finally {
        $provider.Dispose()
    }
    return ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
}

function Get-EnvValue([string] $Key) {
    if (-not (Test-Path $EnvFile)) { return "" }
    $line = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match "^$([Regex]::Escape($Key))=" } | Select-Object -Last 1
    if (-not $line) { return "" }
    return $line.Substring($line.IndexOf("=") + 1)
}

function Set-EnvValue([string] $Key, [string] $Value) {
    $lines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        [void]$lines.Add($line)
    }
    $matched = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match "^$([Regex]::Escape($Key))=") {
            $lines[$index] = "$Key=$Value"
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        [void]$lines.Add("$Key=$Value")
    }
    [IO.File]::WriteAllLines($EnvFile, $lines, [Text.UTF8Encoding]::new($false))
}

function Generate-PlaceholderSecret([string] $Key) {
    $value = Get-EnvValue $Key
    if ([string]::IsNullOrWhiteSpace($value) -or
        $value -eq "GENERATE_WITH_SETUP" -or
        $value -eq "replace-with-at-least-32-random-characters") {
        Set-EnvValue $Key (New-SecureHex)
        Write-NexxCloudInfo "Generated $Key."
    }
}

function Find-LanIp {
    try {
        $value = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                -not $_.IPAddress.StartsWith("127.") -and
                -not $_.IPAddress.StartsWith("169.254.") -and
                -not $_.IPAddress.StartsWith("172.17.")
            } |
            Sort-Object { if ($_.IPAddress.StartsWith("192.168.") -or $_.IPAddress.StartsWith("10.")) { 0 } else { 1 } } |
            Select-Object -First 1
        if ($value) { return $value.IPAddress }
    } catch {}
    return ""
}

function Assert-PortAvailable([string] $Port) {
    if (-not $Port) { return }
    $listener = Get-NetTCPConnection -State Listen -LocalPort ([int]$Port) -ErrorAction SilentlyContinue
    if ($listener) {
        Throw-NexxCloudError "Port $Port is already in use. Change FRONTEND_PORT/BACKEND_PORT in .env or stop the existing service."
    }
}

function Resolve-InitialPort([string] $EnvironmentKey, [string] $DefaultPort) {
    $value = [Environment]::GetEnvironmentVariable($EnvironmentKey)
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultPort
    }
    $parsed = 0
    if (-not [int]::TryParse($value, [ref]$parsed) -or $parsed -lt 1 -or $parsed -gt 65535) {
        Throw-NexxCloudError "$EnvironmentKey must be a port number from 1 through 65535."
    }
    return $value
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Throw-NexxCloudError "Docker is not installed. Install Docker Desktop and run setup again."
}
docker compose version *> $null
if ($LASTEXITCODE -ne 0) {
    Throw-NexxCloudError "Docker Compose v2 is required."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Throw-NexxCloudError "Docker Desktop is installed but is not running."
}

$lanIp = Find-LanIp
$hostName = $env:COMPUTERNAME
if (-not $hostName) { $hostName = "nexxcloud" }
$composeProjectName = if ($env:NEXXCLOUD_PROJECT_NAME) { $env:NEXXCLOUD_PROJECT_NAME } else { "nexxcloud" }
if ($composeProjectName -notmatch "^[a-z0-9][a-z0-9_-]*$") {
    Throw-NexxCloudError "NEXXCLOUD_PROJECT_NAME may contain only lowercase letters, digits, underscores, and hyphens."
}
$initialFrontendPort = Resolve-InitialPort "NEXXCLOUD_FRONTEND_PORT" "3000"
$initialBackendPort = Resolve-InitialPort "NEXXCLOUD_BACKEND_PORT" "4000"
$initialDataDir = if ($env:NEXXCLOUD_DATA_DIR) { $env:NEXXCLOUD_DATA_DIR } else { "./data" }

if (-not (Test-Path $EnvFile)) {
    $content = @"
# Generated securely by setup.ps1. Back this file up separately from user data.
NODE_ENV=production
COMPOSE_PROJECT_NAME=$composeProjectName
FRONTEND_PORT=$initialFrontendPort
BACKEND_PORT=$initialBackendPort
FRONTEND_BIND_ADDRESS=0.0.0.0
BACKEND_BIND_ADDRESS=0.0.0.0
NEXXCLOUD_DATA_DIR=$initialDataDir

DB_USER=nexxcloud
DB_PASSWORD=$(New-SecureHex)
DB_NAME=nexxcloud

JWT_SECRET=$(New-SecureHex)
JWT_REFRESH_SECRET=$(New-SecureHex)
MEDIA_TOKEN_SECRET=$(New-SecureHex)
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=$(New-SecureHex)

FRONTEND_URL=http://localhost:$initialFrontendPort
CORS_ORIGINS=
TRUST_PROXY=loopback, linklocal, uniquelocal
HOST_LAN_IP=$lanIp
HOST_HOSTNAME=$hostName

MAX_FILE_SIZE=10995116277760
UPLOAD_CHUNK_SIZE=67108864
MAX_UPLOAD_CHUNK_SIZE=268435456
TRASH_RETENTION_DAYS=30
MAX_VERSIONS_PER_FILE=10
DEFAULT_STORAGE_QUOTA=10995116277760
CHUNK_UPLOAD_CONCURRENCY=3
MAX_FILES_PER_USER=100000
MAX_UPLOADS_PER_MINUTE=300
"@
    [IO.File]::WriteAllText($EnvFile, $content, [Text.UTF8Encoding]::new($false))
    Write-NexxCloudInfo "Created .env with cryptographically random deployment secrets."
} else {
    Write-NexxCloudInfo "Using existing .env; generating only missing template secrets."
    Generate-PlaceholderSecret "DB_PASSWORD"
    Generate-PlaceholderSecret "JWT_SECRET"
    Generate-PlaceholderSecret "JWT_REFRESH_SECRET"
    Generate-PlaceholderSecret "MEDIA_TOKEN_SECRET"
    Generate-PlaceholderSecret "BULL_BOARD_PASSWORD"
}

Push-Location $RootDir
try {
    $existingContainers = docker compose --env-file $EnvFile ps -q 2>$null
} finally {
    Pop-Location
}
if (-not $existingContainers) {
    $frontendPort = Get-EnvValue "FRONTEND_PORT"
    $backendPort = Get-EnvValue "BACKEND_PORT"
    if (-not $frontendPort) { $frontendPort = "3000" }
    if (-not $backendPort) { $backendPort = "4000" }
    Assert-PortAvailable $frontendPort
    Assert-PortAvailable $backendPort
}

& (Join-Path $RootDir "start.ps1")
