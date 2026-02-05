# Diagrama de Estados - Flag intentionallyDisconnected

## Estado del Flag en Cada Situación

```
┌─────────────────────────────────────────────────────────────────┐
│                        LÍNEA INICIAL                             │
│                  status: DISCONNECTED                            │
│            intentionallyDisconnected: false                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /lines/:id/connect
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CONECTANDO                                  │
│                  status: INITIALIZING                            │
│   intentionallyDisconnected: false (RESETEA aquí)                │
│                  ready: false                                    │
│              initializing: true                                  │
└─────────────────────────────────────────────────────────────────┘
                    │                  │
         (Usuario escanea QR)  (Error: auth_failure)
         o (Carga automática)       │
                    │               ↓
                    │   ┌─────────────────────────────────┐
                    │   │   status: DISCONNECTED          │
                    │   │   Schedules: RECONNECT AUTO     │
                    │   │   (intentionallyDisconnected     │
                    │   │    no se modifica - false)      │
                    │   └─────────────────────────────────┘
                    │
                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CONECTADO                                    │
│                  status: CONNECTED                               │
│            intentionallyDisconnected: false                      │
│                    ready: true                                   │
│                initializing: false                               │
└─────────────────────────────────────────────────────────────────┘
       │                              │
       │ POST /lines/:id/disconnect   │ Desconexión accidental
       │ (Usuario clicks btn)         │ (WiFi cae, error, etc)
       │                              │
       ↓                              ↓
   ┌───────────────────┐      ┌──────────────────────┐
   │ SET FLAG TO TRUE  │      │  FLAG PERMANECE FALSE│
   │ destroy() llamado │      │ client emits         │
   │                   │      │ "disconnected" event │
   │ status: DISC.     │      │                      │
   │ NO RECONNECT ✓    │      │ status: DISC.        │
   │                   │      │ RECONNECT AUTO ✓     │
   └───────────────────┘      └──────────────────────┘
       │                              │
       │ Condición en "disconnected": │
       │ if (!session.               │
       │   intentionallyDisconnected) │
       │                              │
       │ TRUE = falso                 │ TRUE = verdadero
       │ NO scheduleReconnect()       │ ✓ scheduleReconnect()
       │                              │
       ↓                              ↓
   ┌────────────────────────┐   ┌─────────────────────┐
   │ Permanece desconectado │   │ Intenta reconectar  │
   │ Usuario puede conectar │   │ con backoff:        │
   │ manualmente luego      │   │ 5s, 10s, 15s...     │
   │                        │   │                     │
   │ Log: "Skipping auto-   │   │ Log: "Reconnecting" │
   │ reconnect: intentional │   │                     │
   │ disconnection"         │   │                     │
   └────────────────────────┘   └─────────────────────┘
           │                            │
           │ POST /lines/:id/connect    │ Éxito de reconexión
           │ (User conecta nuevamente)  │ (después de 5-15s)
           │                            │
           ↓                            ↓
   ┌──────────────────────┐      ┌─────────────────────┐
   │ FLAG RESETEADO       │      │ Vuelta a CONECTADO  │
   │ a false en connect() │      │ automáticamente     │
   │ Nueva conexión       │      │ (sin que user haga  │
   │ inicia normalmente   │      │  nada)              │
   └──────────────────────┘      └─────────────────────┘
```

---

## Tabla Comparativa: Tipos de Desconexión

| Tipo | Causa | intentionallyDisconnected | Auto-reconnect | Observación |
|------|-------|---------------------------|-----------------|------------|
| **Desconexión Intencional** | Usuario click "Desconectar" | `true` | ❌ NO | Línea permanece desconectada hasta que user la reconecta |
| **Desconexión Accidental** | WiFi cae, error temporal | `false` | ✅ SÍ | Intenta reconectar con backoff exponencial |
| **Auth Failure** | Token expirado o inválido | N/A | ✅ SÍ | Resetea y reintenta con { reset: true } |
| **Target Closed** | Browser se cierra (crash) | N/A | ✅ SÍ | Limpia y resetea, reintenta |
| **Browser Conflict** | Otro proceso usa el browser | N/A | ✅ SÍ | Mata proceso, limpia, reintenta |
| **BAN (Bloqueado)** | WhatsApp bloqueó el número | N/A | ❌ NO | Alerta de riesgo, safe mode activado |

---

## Flujo de Eventos - Desconexión Intencional

```
┌─ Frontend ──────────────────┐     ┌─ Backend ──────────────────────────┐
│                             │     │                                    │
│ User: Click "Desconectar"   │     │                                    │
│           │                 │     │                                    │
│           ↓                 │     │                                    │
│ POST /lines/:id/disconnect  │────→│ disconnect(lineId)                 │
│           │                 │     │        │                          │
│           │                 │     │        ├─ intentionallyDisconnected│
│           │                 │     │        │  = true                   │
│           │                 │     │        │                          │
│           │                 │     │        ├─ client.destroy()        │
│           │                 │     │        │        │                 │
│           │                 │     │        └────────┼─────────┐       │
│           │                 │     │                 │         │       │
│           │                 │     │         (Emitted by whatsapp-web) │
│           │                 │     │                 │         │       │
│           │                 │     │                 ↓         ↓       │
│           │                 │     │           emit("disconnected")    │
│           │                 │     │                 │                 │
│           │                 │     │        Check: intentionallyDisc..?│
│           │                 │     │                 │                 │
│           │                 │     │            (TRUE → don't reconnect
│           │                 │     │                      │             │
│           │                 │     │        Log: "Skipping auto-reconn"│
│           │                 │     │                      │             │
│           ↓                 │     │                      ↓             │
│ Receive response:           │ ←───│ Response: {ok: true, ...}         │
│ { ok: true,                 │     │                                   │
│   lineId: "11",             │     │ emit("status:update")             │
│   status: "DISCONNECTED"    │     │  → {lineId: "11",                 │
│ }                           │     │      status: "DISCONNECTED"}      │
│    │                        │     │                                   │
│    ↓                        │     │                                   │
│ Socket.io: "status:update"  │←────│  (Connection channel)             │
│    │                        │     │                                   │
│    ↓                        │     │                                   │
│ Update state:               │     │                                   │
│ statusList[11] = {          │     │                                   │
│   id: 11,                   │     │                                   │
│   status: "DISCONNECTED"    │     │                                   │
│ }                           │     │                                   │
│    │                        │     │                                   │
│    ↓                        │     │                                   │
│ Re-render:                  │     │                                   │
│ - Botón Desconectar         │     │                                   │
│   se deshabilita ✓          │     │                                   │
│ - Botón Conectar            │     │                                   │
│   se habilita ✓             │     │                                   │
│ - Status: "DESCONECTADO"    │     │                                   │
│ - Spinner desaparece ✓      │     │                                   │
│                             │     │                                   │
└─────────────────────────────┘     └────────────────────────────────────┘
```

---

## Flujo de Eventos - Desconexión Accidental (No Intencional)

```
┌─ Frontend ──────────────────┐     ┌─ Backend ──────────────────────────┐
│                             │     │                                    │
│ User: Internet connection   │     │ (Accidental event from WhatsApp)   │
│       drops                 │     │                                    │
│           │                 │     │ Websocket: "disconnected"          │
│           │                 │     │ reason: "DISCONNECTED"             │
│           │                 │     │        │                          │
│           │                 │     │        ↓                          │
│           │                 │     │ Event handler:                    │
│           │                 │     │ client.on("disconnected")         │
│           │                 │     │        │                          │
│           │                 │     │        ├─ status = DISCONNECTED  │
│           │                 │     │        │  ready = false           │
│           │                 │     │        │  intentionallyDisconnected
│           │                 │     │        │  is STILL FALSE          │
│           │                 │     │        │                          │
│           │                 │     │        ├─ Check: reason !== "BAN"│
│           │                 │     │        │         && !intentional │
│           │                 │     │        │  Result: TRUE            │
│           │                 │     │        │         (Reconnect!)     │
│           │                 │     │        │                          │
│           │                 │     │        └─ scheduleReconnect()    │
│           │                 │     │           with backoff            │
│           │                 │     │  Attempt 1: 5s +/- jitter        │
│           │                 │     │  Attempt 2: 10s +/- jitter       │
│           │                 │     │  Attempt 3: 15s +/- jitter       │
│           │                 │     │  ...                              │
│           │                 │     │        │                          │
│           │                 │     │ emit("status:update")            │
│           │                 │     │  → {lineId: "11",                │
│           │                 │     │      status: "DISCONNECTED"}    │
│           │                 │     │                                  │
│           │                 │     ├─ [WAIT 5 SECONDS]               │
│           │                 │     │        │                         │
│           │                 │     │        ↓                         │
│           │                 │     │ setTimeout callback:              │
│           │                 │     │ connect(lineId) - Reintent       │
│           │                 │     │        │                         │
│ Internet restored ──────────│────→│ [Browser reconnects]             │
│           │                 │     │        │                         │
│           │                 │     │        ↓                         │
│           ↓                 │     │ client.on("ready")              │
│ Socket.io reconnect:        │     │        │                         │
│ Recibe status:update        │←────│ emit("status:update")            │
│ → status: "DISCONNECTED"    │     │  → {lineId: "11",               │
│   (aún no actualizado)      │     │      status: "CONNECTED"}       │
│    │                        │     │        │                         │
│    │ (espera 5-15s)         │     │        ↓                         │
│    ↓                        │     │ [Reintento tuvo éxito]           │
│ Socket.io: status update    │←────│ emit("status:update")            │
│ → {lineId: "11",            │     │  → {lineId: "11",               │
│    status: "CONNECTED"}     │     │      status: "CONNECTED"}       │
│    │                        │     │                                  │
│    ↓                        │     │ Log: "Ready!" "Sesión            │
│ Re-render:                  │     │ reconectada satisfactoriamente"  │
│ - Status: CONECTADO ✓       │     │                                  │
│ - Pulse indicator ✓         │     │                                  │
│ - Puede enviar msgs ✓       │     │                                  │
│                             │     │                                  │
│ [TODO FUNCIONA AUTOMÁTICO]  │     │ (SIN que el user haga nada!)     │
│                             │     │                                  │
└─────────────────────────────┘     └────────────────────────────────────┘
```

---

## Transiciones de Estado - Máquina de Estados Simplificada

```
                        CREADA
                          │
                          │ user.connect()
                          ↓
                    INICIALIZANDO
                     │         │
        (Error)──────┤         ├─────(QR generado)
                     │         │
                     ↓         ↓
               DESCONECTADA   QR
                     ↑         │
                     │         │ user.escanea_QR()
                     │         ↓
                     └─────CONECTADA
                     ↑         │
         (Reconecta  │         │ user.disconnect()
          automático)│         │ (intentionallyDisconnected=true)
                     │         ↓
                     │     DESCONECTADA
                     │         │
                     └─────────┘
                          │
                   No se reconecta
                   automáticamente
                   hasta que:
                   user.connect()
```

---

## Resumen de Lógica

```
disconnected_event_handler:
│
├─ if reason == "BAN":
│  └─ Enable safe mode, NO reconnect
│
└─ else:
   ├─ if session.intentionallyDisconnected:
   │  └─ Log: "Skipping auto-reconnect: intentional disconnection"
   │     NO scheduleReconnect()
   │
   └─ else:
      └─ ✓ scheduleReconnect() - Auto-reconnect with backoff
         Attempt 1: 5s
         Attempt 2: 10s
         Attempt 3: 15s
         Attempt N: min(60s, 5s*N)
```

---

## Implicaciones para Testing

### Esperado en Test 5 (Desconexión intencional):
```
POST /lines/11/disconnect
← 200 OK {ok: true, status: "DISCONNECTED"}

Logs esperados:
[INFO] disconnect() called for line 11
[WARN] Error destroying client (OK si está ya destruido)
[INFO] Line 11 status updated to DISCONNECTED
[EMIT] status:update {lineId: "11", status: "DISCONNECTED"}
[INFO] Skipping auto-reconnect: intentional disconnection

Lo que NO debe verse:
✗ "Scheduling reconnect"
✗ "Reconnecting in"
✗ "Reconnection attempt"

Frontend:
- Estado cambia a "DESCONECTADO"
- Permanece así (sin parpadeos ni reconexión)
- Botón "Conectar" está habilitado
```

### Esperado en Test 6 (Desconexión accidental):
```
[Simular: cortar conexión de internet]

Logs esperados:
[INFO] client.on("disconnected") - reason: DISCONNECTED
[INFO] Disconnected from WhatsApp: DISCONNECTED
[WARN] Scheduling reconnect for line 11 - reason: DISCONNECTED
[INFO] Reconnecting in 5234ms

[Después 5s, cuando se restaura internet]
[INFO] Reconnection attempt #1
[INFO] WhatsApp client initializing...
[INFO] ready event - Line 11 is ready!
[EMIT] status:update {lineId: "11", status: "CONNECTED"}

Frontend:
- Brevemente muestra "DESCONECTADO"
- Luego auto-reconecta a "CONECTADO"
- Usuario no necesita hacer nada
```

