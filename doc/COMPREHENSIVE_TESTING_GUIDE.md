# Guía Completa de Testing - WhatsApp Bot Backend

## Setup Inicial

### Prerequisitos
- Token JWT válido guardado en variable de ambiente: `$TOKEN`
- ID de línea para testing: Reemplaza `11` con el tuyo si es diferente
- URL base: `https://api.ciguadev.com` (o tu URL local `http://localhost:4000`)
- API Key para webhooks (si está configurada): Guarda en `$API_KEY`

### Obtener Token JWT
```bash
# Para obtener el token, primero haz login
curl -X POST https://api.ciguadev.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"tu_password"}'

# Guarda el token retornado:
$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
$API_KEY = "tu_api_key_si_esta_configurada"
$BASE_URL = "https://api.ciguadev.com"
$LINE_ID = "11"
```

---

## Test 1: Listar Todas las Líneas

**Verifica:** El endpoint GET /lines devuelve todas las líneas registradas

```bash
curl -X GET "$BASE_URL/api/lines" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
[
  {
    "id": 11,
    "name": "ws-testing",
    "phone": "8498022238",
    "status": "DISCONNECTED",
    "n8n_webhook_url": null,
    "webhook_enabled": false,
    "rate_limit_minute": 15,
    "rate_limit_hour": 300,
    "rate_limit_day": 1000,
    "safeMode": {
      "active": false
    }
  }
]
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ Array de líneas se retorna
- ✅ Cada línea tiene id, name, phone, status
- ✅ SafeMode es objeto con active: false (si no hay bloqueo)

---

## Test 2: Conectar una Línea

**Verifica:** El endpoint POST /lines/:id/connect inicia la conexión de WhatsApp

```bash
curl -X POST "$BASE_URL/api/lines/$LINE_ID/connect" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK) - Primera conexión:**
```json
{
  "lineId": "11",
  "status": "QR"
}
```

**Respuesta esperada (409 Conflict) - Si ya está conectando:**
```json
{
  "lineId": "11",
  "status": "QR"  // o "CONNECTED" o "INITIALIZING"
}
```

**Qué verificar:**
- ✅ Status code es 200 o 409 (ambos son OK)
- ✅ Response contiene `lineId`
- ✅ Response contiene `status` (QR, INITIALIZING, o CONNECTED)
- ✅ En el frontend debería aparecer un modal con el QR
- ✅ En los logs backend: `[INFO] WhatsApp client initialized`

**Logs esperados:**
```
[INFO] Session manager - connect() called for line 11
[INFO] WhatsApp client initializing...
[INFO] QR code generated - please scan with your phone
```

---

## Test 3: Obtener QR Actual

**Verifica:** Puedes obtener el QR en cualquier momento para mostrarlo al usuario

```bash
curl -X GET "$BASE_URL/api/lines/$LINE_ID/qr" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
{
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACHMM...",
  "info": {
    "status": "QR",
    "initializing": true,
    "ready": false,
    "lastError": null,
    "lock": {
      "locked": false,
      "files": []
    }
  }
}
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ `qr` contiene un data URI con imagen PNG en base64
- ✅ `info.status` es "QR" o "CONNECTED" según el estado
- ✅ `info.initializing` es true si aún no está lista
- ✅ `info.lock.locked` es false (si está true, hay problema de lock)

---

## Test 4: Obtener Estadísticas de Línea

**Verifica:** El endpoint GET /lines/:id/stats devuelve conteos de chats y contactos

```bash
curl -X GET "$BASE_URL/api/lines/$LINE_ID/stats" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
{
  "lineId": "11",
  "chats": 0,
  "contacts": 0,
  "phone": "8498022238",
  "name": "ws-testing"
}
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ `chats` es número >= 0
- ✅ `contacts` es número >= 0
- ✅ Si la línea está recién conectada, ambos pueden ser 0 (es normal)
- ✅ Si envíaste mensajes, `chats` y `contacts` deberían incrementar

**Nota:** Los números se actualizan cuando:
- Recibes un mensaje entrante
- Envías un mensaje saliente
- Se crea una nueva conversación

---

## Test 5: Desconectar una Línea ⭐ CRITICAL

**Verifica:** El endpoint POST /lines/:id/disconnect desconecta permanentemente (SIN reconectar automáticamente)

```bash
curl -X POST "$BASE_URL/api/lines/$LINE_ID/disconnect" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
{
  "ok": true,
  "lineId": "11",
  "status": "DISCONNECTED"
}
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ Response tiene `ok: true`
- ✅ `status` es "DISCONNECTED"
- ✅ **IMPORTANTE**: En los logs NO debe aparecer `"Scheduling reconnect"`
- ✅ En los logs SÍ debe aparecer `"Skipping auto-reconnect: intentional disconnection"`

**Logs esperados:**
```
[INFO] Session manager - disconnect() called for line 11
[WARN] Error destroying client during disconnect: <error_msg> (OK si hay error, cliente ya destruido)
[INFO] Line 11 status updated to: DISCONNECTED
[EMIT] status:update event sent: {lineId: "11", status: "DISCONNECTED"}
[INFO] Skipping auto-reconnect: intentional disconnection
```

**Qué NO debe aparecer:**
```
❌ "Scheduling reconnect for line 11"
❌ "Starting reconnection attempt"
❌ "Auto-reconnecting in 5000ms"
```

**Test visual en frontend:**
1. Línea debe cambiar a "Desconectado" inmediatamente
2. Botón "Desconectar" debe deshabilitarse
3. Botón "Conectar" debe habilitarse
4. Spinner de carga debe desaparecer
5. **No debe reconectarse automáticamente** en los siguientes 30 segundos

---

## Test 6: Desconexión No Intencional (Simular Error de Red)

**Verifica:** Si la conexión se pierde accidentalmente, se intenta reconectar automáticamente

**Procedimiento:**
1. Conecta una línea exitosamente
2. En la PC con Docker, corta la conexión de red:
   ```bash
   docker exec backend pkill -f "client.initialize"
   # O simplemente desconecta Ethernet/WiFi
   ```
3. Observa los logs

**Logs esperados:**
```
[INFO] Disconnected from WhatsApp: DISCONNECTED
[INFO] Evaluating risk for frequent disconnects...
[WARN] Scheduling reconnect for line 11 - reason: DISCONNECTED - attempt 1
[INFO] Reconnecting in 5123ms (with jitter)
```

**Qué verificar:**
- ✅ Auto-reconnect SÍ se programa (a diferencia del Test 5)
- ✅ Intenta reconectar con backoff: 5s, 10s, 15s, etc.
- ✅ Después de restaurar conexión, se reconecta automáticamente
- ✅ Frontend muestra estado actualizado

---

## Test 7: Enviar Mensaje

**Verifica:** Puedes enviar mensajes WhatsApp desde la API

```bash
curl -X POST "$BASE_URL/api/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "'$LINE_ID'",
    "to": "+5491234567890",
    "message": "Hola! Este es un mensaje de prueba desde la API"
  }'
```

**Respuesta esperada (201 Created):**
```json
{
  "ok": true,
  "message": {
    "id": 456,
    "lineId": "11",
    "conversationId": 789,
    "direction": "OUT",
    "to": "+5491234567890",
    "from": "11",
    "body": "Hola! Este es un mensaje de prueba desde la API",
    "created_at": "2026-02-05T14:30:00.000Z",
    "updated_at": "2026-02-05T14:30:00.000Z"
  }
}
```

**Qué verificar:**
- ✅ Status code es 201
- ✅ `ok` es true
- ✅ Message tiene id válido
- ✅ `direction` es "OUT"
- ✅ `to` es el número correcto
- ✅ `body` es exactamente lo que enviaste
- ✅ El usuario recibe el mensaje en WhatsApp

**Errores posibles:**
```json
// 429 - Rate limit excedido
{"message": "Rate limit exceeded"}

// 429 - Warm-up limit excedido (línea nueva/recién conectada)
{"message": "Warm-up limit exceeded"}

// 409 - Línea no conectada
{"message": "Line not connected"}

// 423 - Línea en safe mode (bloqueada por riesgo)
{"message": "Safe mode active"}
```

---

## Test 8: Webhook de n8n - Inbound

**Verifica:** n8n puede enviar mensajes de vuelta a WhatsApp

```bash
curl -X POST "$BASE_URL/api/webhooks/inbound" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "'$LINE_ID'",
    "to": "+5491234567890",
    "message": "Esta es una respuesta automática desde n8n"
  }'
```

**Respuesta esperada (201 Created):**
```json
{
  "ok": true,
  "messageId": 457,
  "timestamp": "2026-02-05T14:31:00.000Z"
}
```

**Qué verificar:**
- ✅ Status code es 201
- ✅ `ok` es true
- ✅ `messageId` es un número válido
- ✅ El usuario recibe el mensaje en WhatsApp (enviado como si fuera desde tu app)
- ✅ El mensaje se registra en la base de datos
- ✅ Rate limits se aplican (no puedes spammear)
- ✅ Warm-up limits se aplican

**Errores posibles:**
```json
// 401 - API key inválida o no configurada
{"message": "Unauthorized - Invalid API key"}

// 429 - Rate limit excedido
{"message": "Rate limit exceeded"}

// 400 - Payload inválido (falta lineId, to, o message)
{"message": "Invalid payload: ..."}
```

**Variantes de payload (todas funcionan):**
```bash
# Variante 1: message
{"lineId": "11", "to": "+549...", "message": "Hola"}

# Variante 2: text
{"lineId": "11", "to": "+549...", "text": "Hola"}

# Variante 3: body
{"lineId": "11", "to": "+549...", "body": "Hola"}

# Variante 4: con wa_id (se ignora)
{"lineId": "11", "to": "+549...", "wa_id": "549...", "message": "Hola"}
```

---

## Test 9: Ver Sesiones Activas

**Verifica:** Puedes ver todas las sesiones conectadas

```bash
curl -X GET "$BASE_URL/api/lines/active-sessions" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
[
  {
    "lineId": "11",
    "status": "CONNECTED",
    "initializing": false,
    "ready": true,
    "lastError": null
  }
]
```

**O vacío si no hay sesiones activas:**
```json
[]
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ Es un array
- ✅ Cada sesión activa aparece
- ✅ `ready: true` significa que puede enviar/recibir mensajes
- ✅ `initializing: true` significa que está en proceso de conexión
- ✅ `status` coincide con el estado de la línea

---

## Test 10: Obtener Configuración de Línea

**Verifica:** Puedes obtener todos los settings de una línea

```bash
curl -X GET "$BASE_URL/api/lines/$LINE_ID/settings" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada (200 OK):**
```json
{
  "id": 11,
  "name": "ws-testing",
  "phone": "8498022238",
  "n8nWebhookUrl": "https://n8n.example.com/webhook/...",
  "webhookEnabled": true,
  "webhookBase64": false,
  "ignoreGroups": true,
  "readMessages": true,
  "rateLimitMinute": 15,
  "rateLimitHour": 300,
  "rateLimitDay": 1000
}
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ Todos los settings se retornan
- ✅ `rateLimitMinute/Hour/Day` están configurados correctamente
- ✅ `webhookEnabled` refleja si n8n está activado

---

## Test 11: Actualizar Configuración

**Verifica:** Puedes cambiar settings de una línea

```bash
curl -X PUT "$BASE_URL/api/lines/$LINE_ID/settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookEnabled": true,
    "webhookBase64": false,
    "n8nWebhookUrl": "https://n8n.example.com/webhook/abc123",
    "ignoreGroups": true,
    "readMessages": true
  }'
```

**Respuesta esperada (200 OK):**
```json
{
  "id": 11,
  "name": "ws-testing",
  "phone": "8498022238",
  "n8n_webhook_url": "https://n8n.example.com/webhook/abc123",
  "webhook_enabled": 1,
  ...
}
```

**Qué verificar:**
- ✅ Status code es 200
- ✅ Settings se actualizan en BD
- ✅ Cambios se aplican inmediatamente
- ✅ Los logs muestran: `[INFO] Line settings updated`

---

## Test 12: Rate Limits

**Verifica:** Rate limits se aplican correctamente

### Test 12a: Exceder límite por minuto
```bash
# Si rateLimitMinute = 15, intenta enviar 16 mensajes rápidamente
for i in {1..20}; do
  curl -X POST "$BASE_URL/api/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "lineId": "'$LINE_ID'",
      "to": "+5491234567890",
      "message": "Mensaje '$i'"
    }'
  sleep 0.1
done
```

**Resultado esperado:**
- Los primeros 15 deberían ser 201 (OK)
- El 16º+ deberían ser 429 (Too Many Requests)
- Logs: `[WARN] Rate limit exceeded for line 11`

### Test 12b: Límite se reseteapor minuto
```bash
# Después de esperar 1 minuto, deberías poder enviar nuevamente
sleep 61
curl -X POST "$BASE_URL/api/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lineId":"'$LINE_ID'", "to":"+5491234567890", "message":"Nuevo mensaje"}'
```

**Resultado esperado:** 201 OK (límite reseteo)

---

## Test 13: Seguridad - Autorización

**Verifica:** Endpoints protegidos requieren token válido

### Test 13a: Sin token
```bash
curl -X GET "$BASE_URL/api/lines" 
```

**Respuesta esperada:** 401 Unauthorized

### Test 13b: Token inválido
```bash
curl -X GET "$BASE_URL/api/lines" \
  -H "Authorization: Bearer invalid_token_12345"
```

**Respuesta esperada:** 401 Unauthorized

### Test 13c: Token expirado
```bash
# Espera a que expire (por defecto 24h, pero env lo define)
curl -X GET "$BASE_URL/api/lines" \
  -H "Authorization: Bearer expired_token"
```

**Respuesta esperada:** 401 Unauthorized

---

## Checklist de Debugging

Si algo falla, revisa:

```bash
# Ver logs del backend
docker logs -f backend

# Ver estado de contenedores
docker ps

# Reiniciar si está con problemas
docker compose restart backend

# Ver logs de WhatsApp web
docker logs backend | grep -i whatsapp

# Ver logs de conexión
docker logs backend | grep -i "connect\|disconnect"

# Ver logs de rate limit
docker logs backend | grep -i "rate\|limit"

# Ver logs de Socket.io
docker logs backend | grep -i "socket\|emit\|status"
```

---

## Flujo Completo de Test End-to-End

```bash
#!/bin/bash

set -e

BASE_URL="https://api.ciguadev.com"
TOKEN="tu_token"
LINE_ID="11"

echo "1. Listar líneas..."
curl -s -X GET "$BASE_URL/api/lines" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0] | {id, name, status}'

echo -e "\n2. Conectar línea..."
curl -s -X POST "$BASE_URL/api/lines/$LINE_ID/connect" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n3. Esperar 5 segundos para que se conecte..."
sleep 5

echo -e "\n4. Ver QR o status..."
curl -s -X GET "$BASE_URL/api/lines/$LINE_ID/stats" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n5. Enviar mensaje..."
curl -s -X POST "$BASE_URL/api/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lineId":"'$LINE_ID'", "to":"+5491234567890", "message":"Test message"}' | jq '.'

echo -e "\n6. Desconectar..."
curl -s -X POST "$BASE_URL/api/lines/$LINE_ID/disconnect" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\nTest completado!"
```

