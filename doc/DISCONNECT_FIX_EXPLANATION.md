# Fix del Problema: Disconnect No Responde

## Problema Identificado

El usuario hacía click en "Desconectar" pero la línea no se desconectaba. El botón no respondía y la línea permanecía en estado CONECTADO.

## Raíz del Problema

El problema era una **reconexión automática no intencional**:

1. Usuario hace click en "Desconectar" → `POST /api/lines/:id/disconnect`
2. Backend ejecuta `sessionManager.disconnect(lineId)`:
   - Marca `session.ready = false`
   - Marca `session.status = DISCONNECTED`
   - Llama `session.client.destroy()` para destruir el cliente de WhatsApp
3. El cliente de WhatsApp dispara el evento `client.on("disconnected")`
4. **El problema**: El manejador de `disconnected` **siempre** programaba una reconexión automática con `scheduleReconnect()`
5. Resultado: La línea se desconectaba por 5-10 segundos, luego se reconectaba automáticamente

## Solución Implementada

Se agregó un **flag `intentionallyDisconnected`** en el objeto session:

```javascript
const session = {
  lineId,
  client,
  status: SESSION_STATUSES.CREATED,
  ready: false,
  initializing: false,
  settings: null,
  lastError: null,
  lastQrAt: null,
  lastConnectAt: null,
  lastInitAttemptAt: null,
  intentionallyDisconnected: false  // ← NUEVO FLAG
};
```

### 1. En el método `disconnect()`:

**Antes:**
```javascript
async disconnect(lineId) {
  const session = this.sessions.get(lineId);
  if (!session) return null;
  
  try {
    if (session.client && typeof session.client.destroy === 'function') {
      await session.client.destroy();  // ← Dispara evento "disconnected"
    }
  } catch (error) { /* ... */ }
  
  session.ready = false;
  session.status = SESSION_STATUSES.DISCONNECTED;
  await updateStatus(lineId, session.status);
  this.emitStatus(lineId, session.status);
  return session;
}
```

**Después:**
```javascript
async disconnect(lineId) {
  const session = this.sessions.get(lineId);
  if (!session) return null;

  // Mark as intentionally disconnected to prevent auto-reconnect
  session.intentionallyDisconnected = true;  // ← NUEVO

  try {
    if (session.client && typeof session.client.destroy === 'function') {
      await session.client.destroy();
    }
  } catch (error) { /* ... */ }

  session.ready = false;
  session.status = SESSION_STATUSES.DISCONNECTED;
  await updateStatus(lineId, session.status);
  this.emitStatus(lineId, session.status);
  return session;
}
```

### 2. En el manejador de evento `disconnected`:

**Antes:**
```javascript
client.on("disconnected", async (reason) => {
  session.status = reason === "BAN" ? SESSION_STATUSES.BLOCKED : SESSION_STATUSES.DISCONNECTED;
  session.ready = false;
  session.lastError = reason || "disconnected";
  await updateStatus(lineId, session.status);
  this.emitStatus(lineId, session.status);

  // ... evaluación de riesgos ...

  // SIEMPRE reconectaba (excepto si BAN)
  if (reason !== "BAN") {
    this.scheduleReconnect(lineId, "DISCONNECTED");  // ← SIEMPRE EJECUTABA
  }
});
```

**Después:**
```javascript
client.on("disconnected", async (reason) => {
  session.status = reason === "BAN" ? SESSION_STATUSES.BLOCKED : SESSION_STATUSES.DISCONNECTED;
  session.ready = false;
  session.lastError = reason || "disconnected";
  await updateStatus(lineId, session.status);
  this.emitStatus(lineId, session.status);

  // ... evaluación de riesgos ...

  // Only auto-reconnect if not intentionally disconnected by user
  if (reason !== "BAN" && !session.intentionallyDisconnected) {  // ← NUEVO CHECK
    this.scheduleReconnect(lineId, "DISCONNECTED");
  } else if (session.intentionallyDisconnected) {
    logger.info("Skipping auto-reconnect: intentional disconnection", { lineId });
  }
});
```

### 3. En el método `connect()`:

**Se agregó reset del flag:**
```javascript
async connect(lineId) {
  const session = this.createSession(lineId);
  if (!session.client) return session;

  // ... limpiar timers pendientes ...

  // Reset intentional disconnect flag when user wants to reconnect
  session.intentionallyDisconnected = false;  // ← NUEVO

  if (session.ready || session.initializing) {
    return session;
  }

  // ... resto del código ...
}
```

## Flujo Después del Fix

### Cuando el usuario desconecta:

```
Usuario → Click "Desconectar"
  ↓
Frontend: POST /api/lines/:id/disconnect
  ↓
Backend: disconnect(lineId)
  - session.intentionallyDisconnected = true
  - session.client.destroy()
  - session.ready = false
  - session.status = DISCONNECTED
  - Emite status:update al frontend
  ↓
WhatsApp: Dispara evento "disconnected"
  ↓
Backend: Manejador "disconnected"
  - Evalúa: reason !== "BAN" && !session.intentionallyDisconnected
  - Resultado: FALSO (porque intentionallyDisconnected = true)
  - NO llama scheduleReconnect()
  - Log: "Skipping auto-reconnect: intentional disconnection"
  ↓
Frontend: Recibe status:update
  - Actualiza statusList
  - Botón "Desconectar" se deshabilita
  - Botón "Conectar" se habilita
  ↓
Usuario: Puede ver línea en estado DESCONECTADO
```

### Cuando el usuario intenta reconectar:

```
Usuario → Click "Conectar"
  ↓
Frontend: POST /api/lines/:id/connect
  ↓
Backend: connect(lineId)
  - session.intentionallyDisconnected = false  ← RESETEADO
  - Limpia timers de reconexión pendientes
  - session.initializing = true
  - session.client.initialize()
  ↓
WhatsApp: Inicia proceso de conexión, puede generar QR
  ↓
Usuario: Escanea QR o se conecta automáticamente
```

### Cuando hay una desconexión no intencional (ej: pérdida de conexión a internet):

```
Conexión: Se pierde la conexión a internet
  ↓
WhatsApp: Dispara evento "disconnected" con reason = "DISCONNECTED"
  ↓
Backend: Manejador "disconnected"
  - Evalúa: reason !== "BAN" && !session.intentionallyDisconnected
  - Resultado: VERDADERO (porque no fue intencional)
  - LLAMA scheduleReconnect() con backoff exponencial
  - Intenta reconectar en 5s, 10s, 15s, etc.
  ↓
Conexión: Se restablece y automáticamente se reconecta
```

## Puntos Clave

1. **Flag persistente**: El flag solo se modifica en dos lugares:
   - Se establece a `true` cuando el usuario ejecuta `disconnect()`
   - Se establece a `false` cuando el usuario ejecuta `connect()`

2. **Sin impacto en reconexiones automáticas**: Las desconexiones naturales (pérdida de red, error de WhatsApp) siguen generando reconexión automática como debe ser

3. **Logging mejorado**: Se agregó un log cuando se salta la reconexión automática, útil para debugging

4. **Sem efecto secundarios**: El flag no afecta otros eventos o métodos, solo el manejador `disconnected`

## Testing

Para verificar que funciona:

1. **Test 1 - Desconexión intencional:**
   - Conecta una línea (debe mostrar "CONECTADO")
   - Click en "Desconectar"
   - Verifica que el estado cambie a "DESCONECTADO" y permanezca así
   - Revisa logs para: `"Skipping auto-reconnect: intentional disconnection"`

2. **Test 2 - Reconexión:**
   - Con línea desconectada, click en "Conectar"
   - Debería intentar conectarse o mostrar QR
   - Después de autorizar, debería conectarse

3. **Test 3 - Desconexión automática de WhatsApp:**
   - Conecta una línea
   - En otra terminal, mata el proceso: `docker kill chrome_process` (simula error)
   - WhatsApp debería desconectarse y **automáticamente** reconectarse
   - Revisa logs para intentos de reconexión

4. **Test 4 - Ban (bloqueo):**
   - Si WhatsApp bloquea el número, debería:
     - Status → "BLOQUEADO"
     - NO intentar reconectar (aunque intentionallyDisconnected sea false)
     - Mostrar alerta de riesgo "Número bloqueado"

## Archivos Modificados

- `backend/src/services/session.manager.js`:
  - Línea 231: Se agregó `intentionallyDisconnected: false` al crear session
  - Línea 509: Se resetea flag en `connect()`
  - Línea 591: Se establece flag en `disconnect()`
  - Línea 345-348: Se evalúa flag en manejador `disconnected`

## Impacto en Otros Módulos

✅ **SIN IMPACTO** en:
- API endpoints (solo llaman disconnect())
- Frontend (solo hace llamadas HTTP)
- Base de datos (no se almacena el flag)
- Webhooks (no afecta n8n)
- Rate limiting (no afecta validaciones)
- Safe mode (no interfiere)

El flag es **exclusivamente** de sesión en memoria y solo controla la reconexión automática.

