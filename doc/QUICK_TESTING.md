# Quick Testing Guide - Pruebas en 10 Minutos

**Para verificar rápidamente que el fix funciona sin hacer testing exhaustivo**

---

## ⚡ Test Crítico #1: Desconectar (MUST PASS)

### Setup (1 min)
```bash
# Terminal 1: Watch logs
docker logs -f backend | grep -i "disconnect\|reconnect"

# Terminal 2: Frontend - Abre dashboard
# http://localhost:3000
```

### Acciones (2 min)
```
1. Verifica que tienes una línea CONECTADA
   - Debe mostrar estado: "CONECTADO"
   - Debe tener un botón "Desconectar"

2. Click en botón "Desconectar"

3. Observa qué pasa:
   - El botón debería desactivarse
   - El estado debería cambiar a "DESCONECTADO"
   - Esto debe ocurrir en <1 segundo
```

### Verificación (1 min)
En Terminal 1, deberías ver logs como:

```
✅ ESPERADO:
[INFO] Session manager - disconnect() called for line 11
[INFO] Line 11 status updated to: DISCONNECTED
[EMIT] status:update event sent: {lineId: "11", status: "DISCONNECTED"}
[INFO] Skipping auto-reconnect: intentional disconnection

❌ NO DEBERÍA VER:
- "Scheduling reconnect"
- "Starting reconnection"
- "Reconnecting in"
```

### Esperado en Frontend (durante 30 segundos)
```
Línea debe mostrar:
✅ Status: "DESCONECTADO"
✅ Botón "Conectar" habilitado
✅ Botón "Desconectar" deshabilitado
✅ Sin spinner/indicador de carga
✅ Sin reconexión automática
```

---

## ⚡ Test Crítico #2: Accidental Disconnect (MUST PASS)

### Setup (1 min)
```bash
# Terminal 1: Watch logs
docker logs -f backend | grep -i "disconnect\|reconnect\|ready\|initializing"

# Terminal 2: Asegúrate que la línea está CONECTADA
# Click "Conectar" si está desconectada
```

### Acciones (2 min)
```
1. Verifica que línea está CONECTADA
   - Status: "CONECTADO"
   - Spinner pulsante visible

2. Simula error de red:
   Opción A (más realista):
   - Desconecta WiFi/Ethernet por 10-15 segundos
   - Luego reconecta

   Opción B (si no puedes desconectar red):
   - docker pause backend
   - Espera 10 segundos
   - docker unpause backend

3. Observa qué pasa:
   - El estado puede mostrar "DESCONECTADO" temporalmente
   - Después de 5-15 segundos debería reconectar automáticamente
   - Debería volver a "CONECTADO" sin intervención del usuario
```

### Verificación en Logs (1 min)

Deberías ver:

```
✅ ESPERADO:
[INFO] client.on("disconnected") - reason: DISCONNECTED
[WARN] Scheduling reconnect for line 11 - reason: DISCONNECTED
[INFO] Reconnecting in 5123ms (with jitter)

[Después de 5-15 segundos]
[INFO] Reconnection attempt #1
[INFO] WhatsApp client initializing...
[INFO] ready - Line 11 is ready!
[EMIT] status:update event sent: {lineId: "11", status: "CONNECTED"}
```

### Esperado en Frontend (durante 20 segundos)
```
Timeline:
0s       : Status = "CONECTADO"
0-1s     : Desconexión ocurre
1-5s     : Status = "DESCONECTADO" (puede parpadear)
5-15s    : Spinner mostrando "Reconectando..."
15-20s   : Status = "CONECTADO" (automático!)

IMPORTANTE: Todo esto debe ocurrir SIN que el usuario haga nada
```

---

## 🎯 Resultado Esperado

Después de estos 2 tests críticos:

```
✅ Test 1 (Disconnect): PASS
   - No reconecta automáticamente cuando user desconecta

✅ Test 2 (Accidental): PASS
   - Reconecta automáticamente cuando hay error
   
👉 Si ambos PASS: El fix funcionó correctamente!
```

---

## 📋 Otros Tests Importantes (si tienes 20 min más)

### Test 3: Conectar (2 min)
```bash
curl -X POST "http://localhost:4000/api/lines/11/connect" \
  -H "Authorization: Bearer $TOKEN"
```
Esperado: 200 o 409, con `status: "QR"` o `status: "CONNECTED"`

### Test 4: Enviar Mensaje (2 min)
```bash
curl -X POST "http://localhost:4000/api/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "11",
    "to": "+5491234567890",
    "message": "Prueba desde API"
  }'
```
Esperado: 201 con `ok: true`

### Test 5: Webhook n8n (2 min)
```bash
curl -X POST "http://localhost:4000/api/webhooks/inbound" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "11",
    "to": "+5491234567890",
    "message": "Respuesta desde n8n"
  }'
```
Esperado: 201 con `ok: true`, `messageId`, `timestamp`

---

## 🐛 Si Algo Falla

### "Desconectar no funcionó - sigue reconectando"
```bash
# 1. Verifica que el build incluyó cambios
docker compose up --build

# 2. Verifica que el cambio está en el código
grep -n "intentionallyDisconnected" backend/src/services/session.manager.js
# Debe mostrar 5 líneas

# 3. Verifica logs en tiempo real
docker logs -f backend | grep -i "disconnect"

# 4. Si sigue sin funcionar, comparte:
docker logs backend > /tmp/logs.txt
# Y los primeros 50 líneas de logs.txt
```

### "No veo los logs esperados"
```bash
# Asegúrate de tener los logs activados
docker compose logs backend --tail=100

# O en tiempo real
docker logs -f backend

# O filtrados
docker logs backend 2>&1 | grep -i "disconnect\|reconnect"
```

### "El frontend no actualiza el estado"
```bash
# 1. Abre DevTools (F12)
# 2. Ve a Console
# 3. Busca errores de JavaScript

# 4. Ve a Network tab
# 5. Click "Desconectar"
# 6. Debería ver:
#    - POST /api/lines/11/disconnect (200 OK)
#    - WebSocket message: {eventType: "status:update", ...}

# Si no ves la request, el frontend tiene problema
# Si ves la request pero no actualiza, hay problema en Socket.io
```

---

## ✅ Quick Checklist

```
ANTES de reporting "funciona":

Test 1 (Disconnect):
  ☐ Frontend estado cambió a "DESCONECTADO"
  ☐ Botón Desconectar se deshabilitó
  ☐ Botón Conectar se habilitó
  ☐ Logs: "Skipping auto-reconnect"
  ☐ No aparece "Scheduling reconnect"

Test 2 (Accidental):
  ☐ Frontend mostró "DESCONECTADO" temporalmente
  ☐ Después de 5-15s, reconectó a "CONECTADO"
  ☐ Logs: "Scheduling reconnect"
  ☐ Logs: "Reconnecting in"
  ☐ Sin intervención del usuario

Otros:
  ☐ Test 3 (Conectar) devuelve 200/409
  ☐ Test 4 (Mensaje) devuelve 201
  ☐ Test 5 (Webhook) devuelve 201
  ☐ Sin crasheos de contenedores
  ☐ Sin errores de JavaScript en console
```

---

## 🚀 Flujo Rápido Completo

```bash
#!/bin/bash

set -e

# 1. Setup
echo "Iniciando setup..."
docker logs -f backend 2>&1 | grep -i "disconnect" > /tmp/logs.txt &
LOG_PID=$!

# 2. Test Disconnect
echo "Test 1: Desconectando línea..."
sleep 2

echo "Verifica logs para: 'Skipping auto-reconnect'"
grep -i "skipping" /tmp/logs.txt

# 3. Test Accidental
echo "Test 2: Simulando error de red..."
docker pause backend
sleep 10
docker unpause backend
sleep 20

echo "Verifica logs para: 'Scheduling reconnect'"
grep -i "scheduling" /tmp/logs.txt

# Cleanup
kill $LOG_PID

echo "Tests completados!"
```

---

## 💡 Tips

1. **Mantén logs abiertos**: `docker logs -f backend` en una terminal separada
2. **Usa grep para filtrar**: `docker logs backend | grep -i "disconnect\|reconnect"`
3. **DevTools Network tab**: Imprescindible para ver HTTP requests
4. **Espera suficiente tiempo**: Reconexión automática tarda 5-15 segundos
5. **Limpia estado entre tests**: Cierra/abre navegador si algo se queda colgado

---

## 📊 Resumen

**Si ambos tests críticos PASS: El fix está funcionando correctamente** ✅

**Si uno falla: Hay un problema que necesita ser debuggeado** ⚠️

Ver sección "Si Algo Falla" arriba para troubleshooting.

