[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepositoryUrl = if ($env:NEXXCLOUD_REPOSITORY_URL) { $env:NEXXCLOUD_REPOSITORY_URL } else { "https://github.com/ShadowSafin/NewCloud.git" }
$RepositoryRef = if ($env:NEXXCLOUD_REPOSITORY_REF) { $env:NEXXCLOUD_REPOSITORY_REF } else { "main" }

function Write-NexxCloudInfo([string] $Message) {
    Write-Host "[NexxCloud] $Message" -ForegroundColor Cyan
}

function Throw-NexxCloudError([string] $Message) {
    throw "[NexxCloud] $Message"
}

if ($env:NEXXCLOUD_INSTALL_DIR) {
    $target = if ([IO.Path]::IsPathRooted($env:NEXXCLOUD_INSTALL_DIR)) {
        [IO.Path]::GetFullPath($env:NEXXCLOUD_INSTALL_DIR)
    } else {
        [IO.Path]::GetFullPath((Join-Path (Get-Location) $env:NEXXCLOUD_INSTALL_DIR))
    }
} else {
    $userProfile = [Environment]::GetFolderPath("UserProfile")
    if ([string]::IsNullOrWhiteSpace($userProfile)) {
        $userProfile = $HOME
    }
    if ([string]::IsNullOrWhiteSpace($userProfile)) {
        Throw-NexxCloudError "Could not determine your user profile. Set NEXXCLOUD_INSTALL_DIR to a writable folder."
    }
    $target = Join-Path $userProfile "NexxCloud"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Throw-NexxCloudError "Git is required to install NexxCloud from GitHub."
}

$setupScript = Join-Path $target "setup.ps1"
$composeFile = Join-Path $target "docker-compose.yml"
$gitDirectory = Join-Path $target ".git"

if ((Test-Path -LiteralPath $gitDirectory) -and
    (Test-Path -LiteralPath $setupScript) -and
    (Test-Path -LiteralPath $composeFile)) {
    Write-NexxCloudInfo "Existing installation found in $target; launching it without changing its checked-out source."
    & $setupScript
    if ($LASTEXITCODE -ne 0) {
        Throw-NexxCloudError "Existing NexxCloud installation failed to start."
    }
    return
}

if (Test-Path -LiteralPath $target) {
    Throw-NexxCloudError "$target exists but is not a NexxCloud checkout. Set NEXXCLOUD_INSTALL_DIR to another location."
}

Write-NexxCloudInfo "Cloning $RepositoryUrl ($RepositoryRef) into $target"
git clone --branch $RepositoryRef --single-branch $RepositoryUrl $target
if ($LASTEXITCODE -ne 0) {
    Throw-NexxCloudError "Git clone failed."
}

& $setupScript
if ($LASTEXITCODE -ne 0) {
    Throw-NexxCloudError "NexxCloud setup failed."
}
