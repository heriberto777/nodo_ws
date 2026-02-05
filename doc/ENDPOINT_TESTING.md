# Guía de Testing de Endpoints

## Requisitos
- Token JWT válido guardado en `$TOKEN`
- URL base: `https://api.ciguadev.com` o tu URL local
- ID de línea: `11` (reemplaza si es diferente)

## 1. GET /api/lines - Listar todas las líneas

```bash
curl -X GET https://api.ciguadev.com/api/lines \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
[
  {
    "id": 11,
    "name": "ws-testing",
    "phone": "8498022238",
    "status": "CONNECTED",
    "safeMode": null,
    ...
  }
]
```

---

## 2. POST /api/lines/:id/connect - Conectar línea

```bash
curl -X POST https://api.ciguadev.com/api/lines/11/connect \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "lineId": "11",
  "status": "QR"  // o "CONNECTED" si ya está conectada
}
```

---

## 3. POST /api/lines/:id/disconnect - Desconectar línea

```bash
curl -X POST https://api.ciguadev.com/api/lines/11/disconnect \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "lineId": "11",
  "status": "DISCONNECTED"
}
```

---

## 4. GET /api/lines/:id/qr - Obtener QR

```bash
curl -X GET https://api.ciguadev.com/api/lines/11/qr \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "qr": "data:image/png;base64,...",
  "info": {
    "status": "QR",
    "initializing": true,
    "ready": false,
    "lastError": null
  }
}
```

---

## 5. GET /api/lines/:id/stats - Obtener estadísticas

```bash
curl -X GET https://api.ciguadev.com/api/lines/11/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
{
  "lineId": "11",
  "chats": 5,
  "contacts": 12,
  "phone": "8498022238",
  "name": "ws-testing"
}
```

---

## 6. POST /api/messages - Enviar mensaje

```bash
curl -X POST https://api.ciguadev.com/api/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "11",
    "to": "+5491234567890",
    "message": "Hola, este es un mensaje de prueba"
  }'
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "message": {
    "id": 123,
    "lineId": "11",
    "conversationId": 456,
    "direction": "OUT",
    "to": "+5491234567890",
    "from": "11",
    "body": "Hola, este es un mensaje de prueba",
    "created_at": "2026-02-05T10:00:00.000Z"
  }
}
```

---

## 7. POST /api/webhooks/inbound - Enviar mensaje desde n8n

```bash
curl -X POST https://api.ciguadev.com/api/webhooks/inbound \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "lineId": "11",
    "to": "+5491234567890",
    "message": "Respuesta automática desde n8n"
  }'
```

**Respuesta esperada:**
```json
{
  "ok": true,
  "messageId": 124,
  "timestamp": "2026-02-05T10:00:00.000Z"
}
```

---

## 8. GET /api/lines/active-sessions - Ver sesiones activas

```bash
curl -X GET https://api.ciguadev.com/api/lines/active-sessions \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta esperada:**
```json
[
  {
    "lineId": "11",
    "status": "ready",
    "initializing": false,
    "ready": true,
    "lastError": null
  }
]
```

---

## Checklist de Errores Comunes

### Error 401 Unauthorized
- [ ] Token JWT válido
- [ ] Header `Authorization: Bearer $TOKEN`
- [ ] Token no expirado

### Error 404 Not Found
- [ ] Line ID correcto
- [ ] Línea existe en BD

### Error 429 Too Many Requests
- [ ] Rate limit no excedido
- [ ] Verificar warm-up limits

### Error 409 Conflict
- [ ] Línea ya en proceso de conexión
- [ ] Esperar a que termine el proceso anterior

### No hay respuesta
- [ ] Verificar logs del servidor: `docker logs backend`
- [ ] Verificar que la línea está en estado correcto

---

## Script Bash para Testing Automático

```bash
#!/bin/bash

TOKEN="tu_token_aqui"
BASE_URL="https://api.ciguadev.com"
LINE_ID="11"

echo "=== Testing Endpoints ==="

echo -e "\n1. GET /api/lines"
curl -s -X GET $BASE_URL/api/lines \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n2. GET /api/lines/$LINE_ID/stats"
curl -s -X GET $BASE_URL/api/lines/$LINE_ID/stats \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n3. GET /api/lines/active-sessions"
curl -s -X GET $BASE_URL/api/lines/active-sessions \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\n4. POST /api/lines/$LINE_ID/disconnect"
curl -s -X POST $BASE_URL/api/lines/$LINE_ID/disconnect \
  -H "Authorization: Bearer $TOKEN" | jq .

echo -e "\nDone!"
```

