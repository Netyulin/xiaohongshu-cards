<#
  install.ps1 — 把本仓库装进某个 skills 目录。

    .\install.ps1                                  # 默认 $HOME\.minimax\skills
    .\install.ps1 -Target "$HOME\.claude\skills"   # 指定目录

  技能目录名固定为 xiaohongshu-cards；目标已存在时先备份成 xiaohongshu-cards.bak-<时间戳>。
#>
[CmdletBinding()]
param(
  [string]$Target = (Join-Path $HOME '.minimax\skills')
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $Target 'xiaohongshu-cards'

if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target -Force | Out-Null }

if (Test-Path $dest) {
  $bak = "$dest.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Move-Item $dest $bak
  Write-Host "已备份旧版本 → $bak"
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Get-ChildItem $root -Force | Where-Object { $_.Name -ne '.git' } | ForEach-Object {
  Copy-Item $_.FullName -Destination $dest -Recurse -Force
}

Write-Host "✓ 装好了：$dest"
Write-Host "  自检：node `"$dest\scripts\doctor.mjs`""
Write-Host "  重启一次 AI 宿主后，技能就会出现在技能列表里。"
