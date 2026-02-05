#!/usr/bin/env pwsh

# Script de Verificación - Cambios en Session Manager
# Este script verifica que todos los cambios para fijar el bug de desconexión están en place

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║    Verificación de Fix - Bug de Desconexión Automática    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$filePath = "backend/src/services/session.manager.js"
$content = Get-Content $filePath -Raw

$checks = @(
    @{
        Name = "Flag intentionallyDisconnected en createSession"
        Pattern = "intentionallyDisconnected:\s*false"
        Found = $content -match "intentionallyDisconnected:\s*false"
    },
    @{
        Name = "Flag seteado en disconnect"
        Pattern = "session\.intentionallyDisconnected\s*=\s*true"
        Found = $content -match "session\.intentionallyDisconnected\s*=\s*true"
    },
    @{
        Name = "Flag chequeado en evento disconnected"
        Pattern = "!session\.intentionallyDisconnected"
        Found = $content -match "!session\.intentionallyDisconnected"
    },
    @{
        Name = "Flag reseteo en connect"
        Pattern = "session\.intentionallyDisconnected\s*=\s*false"
        Found = $content -match "session\.intentionallyDisconnected\s*=\s*false"
    },
    @{
        Name = "Logging para intencional disconnection"
        Pattern = "Skipping auto-reconnect: intentional disconnection"
        Found = $content -match "Skipping auto-reconnect: intentional disconnection"
    }
)

$passed = 0
$failed = 0

foreach ($check in $checks) {
    $status = if ($check.Found) {
        Write-Host "✅ PASS: $($check.Name)" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "❌ FAIL: $($check.Name)" -ForegroundColor Red
        Write-Host "    Patrón: $($check.Pattern)" -ForegroundColor Yellow
        $failed++
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║ Resumen de Verificación                                    ║" -ForegroundColor Cyan
Write-Host "╠════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "║ ✅ TODOS LOS CAMBIOS ESTÁN EN PLACE                       ║" -ForegroundColor Green
    Write-Host "║ Passed: $passed/5                                          ║" -ForegroundColor Green
} else {
    Write-Host "║ ❌ FALTAN CAMBIOS                                          ║" -ForegroundColor Red
    Write-Host "║ Passed: $passed/5  |  Failed: $failed/5                    ║" -ForegroundColor Red
}

Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

exit if ($failed -gt 0) { 1 } else { 0 }
