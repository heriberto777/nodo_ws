# Guía de Prueba Interactiva - Bug Fix de Desconexión

## 🎯 Objetivo
Validar que el bug de desconexión automática ha sido solucionado.

**Antes del fix:** Cuando hacías clic en "Desconectar", la línea se desconectaba por unos segundos pero luego se reconectaba automáticamente.

**Después del fix:** Cuando hagas clic en "Desconectar", la línea debe permanecer desconectada hasta que hagas clic en "Conectar".

---

## 📋 PRE-REQUISITOS

- [ ] Backend está corriendo (`docker compose up` o similar)
- [ ] Frontend está corriendo
- [ ] Tienes una línea conectada (ej: "ws-testing")
- [ ] Tienes acceso a DevTools (F12) para ver Network tab y Console

---

## 🧪 PRUEBA 1: Desconexión Intencional

### Paso 1: Verificar Estado Inicial
1. Abre Dashboard
2. Busca tu línea "ws-testing"
3. Verifica que muestre:
   - Estado: **CONECTADO** (con punto pulsante verde)
   - Botón: **Desconectar** (habilitado)

✅ **Resultado esperado:** Línea visible con estado CONECTADO

### Paso 2: Abrir DevTools
1. Presiona `F12` para abrir DevTools
2. Ve a la pestaña **Network**
3. Filtra por `Fetch/XHR`

### Paso 3: Desconectar
1. Haz clic en el botón **Desconectar**
2. En la pestaña **Network**, deberías ver:
   ```
   POST /api/lines/11/disconnect  → 200 OK
   ```

✅ **Resultado esperado:** Petición POST al endpoint

### Paso 4: Verificar Respuesta
1. Haz clic en la petición POST
2. Ve a la pestaña **Response**
3. Deberías ver:
   ```json
   {
     "ok": true,
     "lineId": "11",
     "status": "DISCONNECTED"
   }
   ```

✅ **Resultado esperado:** Respuesta exitosa con status DISCONNECTED

### Paso 5: Verificar Estado en UI
1. La línea debe mostrar:
   - Estado: **DESCONECTADO** (sin punto pulsante)
   - Botón: **Conectar** (habilitado), **Desconectar** (deshabilitado)

✅ **Resultado esperado:** UI actualiza correctamente

### Paso 6: Esperar 10 Segundos
1. **NO HAGAS NADA**
2. Espera 10 segundos
3. Verifica en Network si aparecen nuevas peticiones de reconexión automática

❌ **BUG anterior:** Veías peticiones POST /api/lines/11/connect automáticamente
✅ **Comportamiento correcto:** NO deberías ver peticiones automáticas

### Paso 7: Verificar Logs del Servidor
1. En terminal donde corre el backend, busca:
   ```
   [INFO] Skipping auto-reconnect: intentional disconnection
   ```

✅ **Resultado esperado:** Log indica que NO está auto-reconectando

---

## 🧪 PRUEBA 2: Reconexión Manual

### Paso 1: Conectar nuevamente
1. Haz clic en el botón **Conectar**
2. En Network, deberías ver:
   ```
   POST /api/lines/11/connect → 200 OK
   ```

✅ **Resultado esperado:** Petición de conexión

### Paso 2: Verificar QR
1. Debería aparecer modal con código QR
2. Escanea con WhatsApp si es necesario

✅ **Resultado esperado:** Modal QR aparece

### Paso 3: Esperar Conexión
1. Espera 5-10 segundos
2. La línea debe mostrar: **CONECTADO**

✅ **Resultado esperado:** Estado vuelve a CONECTADO

---

## 🧪 PRUEBA 3: Desconexión no Intencional (Auto-reconexión)

### Paso 1: Simular Desconexión Accidental
1. Ve a terminal donde corre el backend
2. Busca el proceso del navegador Chromium
3. Mata el proceso Chromium (sin usar tu endpoint de disconnect)

```bash
# En Windows
taskkill /F /IM chrome.exe

# En Linux
pkill -f --user-data-dir
```

### Paso 2: Verificar Auto-Reconexión
1. Espera 5-10 segundos
2. En Network, deberías ver POST a `/api/lines/11/connect` **automáticamente**
3. En logs del servidor, deberías ver:
   ```
   [INFO] Reconnect attempt executed
   ```

✅ **Resultado esperado:** Auto-reconexión **FUNCIONA** para desconexiones accidentales

---

## 📊 Resumen de Resultados

| Prueba | Esperado | Resultado |
|--------|----------|-----------|
| 1.3 POST disconnect retorna 200 | ✅ Sí | [ ] |
| 1.4 Response contiene ok:true | ✅ Sí | [ ] |
| 1.5 UI actualiza a DESCONECTADO | ✅ Sí | [ ] |
| 1.6 NO hay reconexión auto | ✅ No | [ ] |
| 1.7 Logs muestran "Skipping" | ✅ Sí | [ ] |
| 2.1 POST connect retorna 200 | ✅ Sí | [ ] |
| 2.2 QR modal aparece | ✅ Sí | [ ] |
| 2.3 Vuelve a CONECTADO | ✅ Sí | [ ] |
| 3.2 Auto-reconecta en crash | ✅ Sí | [ ] |

---

## 🐛 Si algo falla...

### Error: POST /api/lines/:id/disconnect retorna error
1. Verifica logs del backend: `docker compose logs backend`
2. Busca líneas con "Error disconnecting"
3. Reporta el error exacto

### Problema: UI no se actualiza después de desconectar
1. Abre Console (F12)
2. Busca errores de Socket.io
3. Verifica que Socket.io está conectado (debería haber mensaje "Connected")

### Problema: La línea sigue reconectando automáticamente
1. Los cambios no se recompilaron
2. Reinicia: `docker compose down && docker compose up --build`

### Problema: Desconexión manual funciona pero auto-reconexión no funciona
1. Esto significaría que ahora está "atrapada"
2. Verifica logs: busca `Skipping auto-reconnect` cuando NO debería haber
3. Posible: el cliente de WhatsApp se cerró pero evento 'disconnected' no se disparó

---

## 📝 Notas Técnicas

**¿Qué cambió exactamente?**

1. **Antes del fix:**
   ```javascript
   async disconnect(lineId) {
     // ... destruir cliente ...
     // Cuando se destruye, WhatsApp emite evento 'disconnected'
     // El evento 'disconnected' siempre programa reconexión
   }
   ```

2. **Después del fix:**
   ```javascript
   async disconnect(lineId) {
     session.intentionallyDisconnected = true;  // 🆕 Marcar desconexión intencional
     // ... destruir cliente ...
     // Cuando se destruye, WhatsApp emite evento 'disconnected'
     // El evento 'disconnected' CHEQUEA el flag antes de reconectar
   }

   client.on('disconnected', (reason) => {
     // 🆕 Aquí se chequea:
     if (!session.intentionallyDisconnected) {
       scheduleReconnect();  // Solo si fue accidental
     }
   });
   ```

3. **El flag se resetea cuando el usuario reconecta:**
   ```javascript
   async connect(lineId) {
     session.intentionallyDisconnected = false;  // 🆕 Usuario quiere conectar de nuevo
     // ... inicializar cliente ...
   }
   ```

**¿Por qué funcionaba así antes?**
- El código original no distinguía entre desconexión intencional vs accidental
- Toda desconexión disparaba el mismo evento 'disconnected'
- No había forma de saber si el usuario hizo clic en "Desconectar" o si fue un crash

---

## ✅ Test Completado

Una vez hayas completado todas las pruebas:

1. [ ] Todas las pruebas pasaron ✅
2. [ ] No hay errores en Console
3. [ ] No hay errores en backend logs
4. [ ] UI se actualiza correctamente
5. [ ] Auto-reconexión funciona en casos accidentales

Reporta los resultados al equipo.

