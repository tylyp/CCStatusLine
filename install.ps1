# YetAnotherCCStatusLine installer for Windows

$ErrorActionPreference = "Stop"

$InstallDir = "$env:USERPROFILE\.config\ccstatusline"
$Repo = "https://raw.githubusercontent.com/tylyp/YetAnotherCCStatusLine/main"
$SettingsFile = "$env:USERPROFILE\.claude\settings.json"

Write-Host "Installing YetAnotherCCStatusLine..."

# Create install directory
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

# Download files
Invoke-WebRequest -Uri "$Repo/statusline.js" -OutFile "$InstallDir\statusline.js"
Invoke-WebRequest -Uri "$Repo/config.json" -OutFile "$InstallDir\config.json"

# Configure Claude Code settings
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude" | Out-Null
$Command = "node $InstallDir/statusline.js"

if (Test-Path $SettingsFile) {
    $settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json
    if (-not $settings.statusLine) {
        $settings | Add-Member -NotePropertyName "statusLine" -NotePropertyValue @{} -Force
    }
    $settings.statusLine | Add-Member -NotePropertyName "command" -NotePropertyValue $Command -Force
    $settings | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile
} else {
    @{ statusLine = @{ command = $Command } } | ConvertTo-Json -Depth 10 | Set-Content $SettingsFile
}

Write-Host "Installed to $InstallDir"
Write-Host "Claude Code settings updated."
Write-Host "Restart Claude Code to see your new status line."
Write-Host ""
Write-Host "Customize: $InstallDir\config.json"
