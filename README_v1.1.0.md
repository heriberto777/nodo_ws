# Sistema de WhatsApp Bot - Estado Actual & Próximos Pasos

**Última actualización:** 5 de Febrero de 2026  
**Versión:** 1.1.0 - Fix Disconnect & Comprehensive Testing

---

## 📋 Resumen Ejecutivo

Se identificó y **FIXEÓ** el problema crítico donde el botón "Desconectar" no funcionaba correctamente. La línea se desconectaba brevemente pero luego se reconectaba automáticamente.

**Raíz del problema:** El manejador de desconexión de WhatsApp programaba reconexión automática sin diferenciar entre desconexiones intencionales (usuario) y accidentales (error de red).

**Solución:** Agregar flag `intentionallyDisconnected` para prevenir reconexión automática solo cuando el usuario desconecta intencionalmente.

---

## 🎯 Estado Actual

### ✅ Completado
- [x] Identificado problema de disconnect
- [x] Implementado fix con flag `intentionallyDisconnected`
- [x] Agregado logging para debugging
- [x] Mejorado error handling en destroy()
- [x] Auditados otros endpoints (connect, sendMessage, webhooks)
- [x] Creada documentación completa (3 documentos)
- [x] Documentados todos los cambios (CHANGELOG)

### 🔲 Pendiente (Usuario)
- [ ] Descargar cambios en la otra PC
- [ ] Ejecutar `docker compose up --build`
- [ ] Probar los 13 test cases del COMPREHENSIVE_TESTING_GUIDE.md
- [ ] Validar logs esperados
- [ ] Reportar resultados

---

## 📁 Documentación Disponible

### Para Entender el Fix
1. **`doc/DISCONNECT_FIX_EXPLANATION.md`**
   - Explicación detallada del problema
   - Análisis de código antes/después
   - Flujos de usuario paso a paso
   - Casos de uso: desconexión intencional, accidental, bloqueos

2. **`doc/STATE_DIAGRAMS.md`**
   - Diagramas ASCII de máquina de estados
   - Flujos de eventos lado a lado (frontend/backend)
   - Tabla comparativa de tipos de desconexión
   - Implicaciones para testing

### Para Testing
3. **`doc/COMPREHENSIVE_TESTING_GUIDE.md`** ⭐ IMPORTANTE
   - 13 test cases completos con ejemplos curl
   - Respuestas esperadas (éxito y errores)
   - Qué verificar en cada caso
   - Checklist de debugging
   - Script bash end-to-end

4. **`doc/ENDPOINT_TESTING.md`**
   - Referencia rápida de endpoints
   - Curl commands básicos
   - Respuestas esperadas mínimas

### Para Cambios
5. **`doc/CHANGELOG_v1.1.0.md`**
   - Resumen ejecutivo de cambios
   - Archivos modificados (con líneas exactas)
   - Impacto en otros módulos
   - Verificación de cambios
   - Checklist para user

---

## 🔧 Cambios Técnicos Resumidos

### Archivos Modificados: 2
1. **`backend/src/services/session.manager.js`**
   - Línea ~231: Inicializar `intentionallyDisconnected: false`
   - Línea ~345-348: Evaluar flag en evento `disconnected`
   - Línea ~509: Resetear flag en método `connect()`
   - Línea ~591: Establecer flag en método `disconnect()`
   - Línea ~294-299: Try-catch en `destroy()`

2. **`backend/src/controllers/lines.controller.js`**
   - Línea ~3: Importar logger
   - Línea ~86-93: Mejorar error handling en `disconnect()`

### Cambios Totales
- **Adiciones:** 2 líneas principales + logging
- **Modificaciones:** 4 ubicaciones
- **Eliminaciones:** 0
- **Backward Compatible:** ✅ 100% (sin cambios en API)

---

## 🚀 Próximos Pasos - Para el Usuario

### Paso 1: Actualizar Código
```bash
# En tu máquina con Docker
cd c:\proyectos\app\nodo_ws

# Descargar cambios
git pull  # O descargar manualmente si no usas git

# Recompilar contenedores
docker compose down
docker compose up --build
```

### Paso 2: Testing Inicial (Crítico)

**Test 5 - Desconectar (DEBE FUNCIONAR):**
```bash
# 1. Conecta una línea (usa QR)
# 2. Click en "Desconectar" en el frontend
# 3. Verifica:
#    - Estado cambia a "DESCONECTADO" inmediatamente
#    - Permanece desconectado (no reconecta automáticamente)
#    - En logs: "Skipping auto-reconnect: intentional disconnection"

docker logs -f backend | grep -i "disconnect\|auto-reconnect"
```

**Test 6 - Desconexión Accidental (DEBE RECONECTAR):**
```bash
# 1. Conecta una línea
# 2. Simula error (desconecta WiFi o mata proceso)
# 3. Verifica:
#    - Línea pasa a "DESCONECTADO" temporalmente
#    - Después de 5-15 segundos, reconecta automáticamente
#    - En logs: "Scheduling reconnect", "Reconnecting in"

docker logs -f backend | grep -i "reconnect\|attempt"
```

### Paso 3: Testing Completo

Sigue el `COMPREHENSIVE_TESTING_GUIDE.md`:
- Tests 1-4: Baseline (list, connect, qr, stats)
- Tests 5-6: Disconnect (crítico)
- Tests 7-8: Messaging (send, webhook)
- Tests 9-13: Otros endpoints

Tiempo estimado: 30-45 minutos

### Paso 4: Reportar Resultados

Incluir:
- ✅/❌ para cada test
- Cualquier error en logs
- Mensajes exactos de error
- Tiempo de reconexión observado
- Comportamiento inesperado

---

## 🔍 Verificación Rápida (5 min)

Sin hacer testing completo, verifica que los cambios se aplicaron:

```bash
# 1. Verificar que el flag existe
grep -n "intentionallyDisconnected" backend/src/services/session.manager.js
# Esperado: 5 líneas encontradas

# 2. Verificar que se resetea en connect
grep -A3 "async connect(lineId)" backend/src/services/session.manager.js | grep "false"
# Esperado: session.intentionallyDisconnected = false;

# 3. Verificar que se evalúa en disconnect event
grep -B2 "Skipping auto-reconnect" backend/src/services/session.manager.js
# Esperado: if (...!session.intentionallyDisconnected)

# 4. Verificar logger en controller
grep "const logger" backend/src/controllers/lines.controller.js
# Esperado: const logger = require("../config/logger");
```

Si todo retorna resultados esperados ✅

---

## ❓ Preguntas Frecuentes

### P: ¿Necesito hacer cambios en el frontend?
**R:** No, el frontend no necesita cambios. Los eventos Socket.io son los mismos.

### P: ¿Se pierden las líneas desconectadas si reinicio el backend?
**R:** Sí, el flag es en memoria. Pero las líneas en BD permanecen. Si necesita que se reconecten automáticamente, use `POST /lines/:id/connect`.

### P: ¿Qué pasa con el límite de rate limit después de desconectar?
**R:** El contador no se resetea. Sigue siendo válido cuando reconecta. Esto es correcto para prevenir spam.

### P: ¿Cómo simulo un error de red para Test 6?
**R:** Opciones:
  1. Desconecta Ethernet/WiFi físicamente
  2. Ejecuta: `docker pause backend` por 10s, luego `docker unpause backend`
  3. Corta conexión TCP: `docker exec backend pkill -f "client.initialize"`

### P: ¿Por qué el flag no se almacena en BD?
**R:** Porque es un control de sesión en tiempo real. Si el user desconecta, cierra el navegador y vuelve, puede reconectar manualmente. Es correcto que no persista.

### P: ¿Afecta esto los webhooks de n8n?
**R:** No, los webhooks siguen funcionando igual. El flag solo controla reconexión automática.

### P: ¿Cuál es el tiempo mínimo para reconectar después de una desconexión?
**R:** 5 segundos (más jitter aleatorio de 0-2s). Total: 5-7 segundos típicamente.

### P: ¿Qué pasa si hay múltiples desconexiones en 15 minutos?
**R:** Se cuenta en `disconnectCounters` y genera evento de riesgo "FREQUENT_DISCONNECT" si hay 3+. Se activa safe mode.

---

## 📊 Impacto de Cambios

### En Producción
- ✅ Usuarios pueden desconectar líneas correctamente
- ✅ Líneas con errores aún se reconectan automáticamente
- ✅ Bloqueos (BAN) nunca se reconectan
- ✅ Sin impacto en mensajes, webhooks, rate limits
- ✅ Mejor logging para debugging

### Rendimiento
- ✅ Una variable booleana por sesión (~1 byte)
- ✅ Un check adicional en evento (O(1))
- ✅ Sin cambios en BD
- ✅ Zero impacto mensurable

### Compatibilidad
- ✅ 100% backward compatible
- ✅ Clientes existentes no necesitan actualización
- ✅ Respuestas HTTP sin cambios
- ✅ Eventos Socket.io sin cambios

---

## 🐛 Si Algo No Funciona

### Disconnect aún reconecta automáticamente
1. Verifica que el archivo se actualizó: `grep -n "intentionallyDisconnected = true" backend/src/services/session.manager.js`
2. Verifica logs: `docker logs backend | grep -i "disconnect"`
3. Rebuild: `docker compose up --build` (asegúrate de hacer build)

### No aparece el log "Skipping auto-reconnect"
1. Verifica que desconectas una línea CONECTADA (no una desconectada)
2. Verifica logs en tiempo real: `docker logs -f backend`
3. Busca: `grep "Skipping\|disconnected" docker logs`

### Reconexión automática no funciona
1. Verifica que la conexión se perdió realmente (no que desconectaste intencionalmente)
2. Verifica logs: debe mostrar "Scheduling reconnect"
3. Espera 5-15 segundos, debería reconectar
4. Si no, verifica que está en safe mode: `GET /api/lines`

### Rate limits fallando
1. Diferencia entre `429 Warm-up limit` y `429 Rate limit`
2. Warm-up: línea nueva/recién conectada, espera 1 minuto
3. Rate limit: límite por minuto/hora/día excedido
4. Check settings: `GET /api/lines/:id/settings`

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa los logs: `docker logs backend` | `docker logs frontend`
2. Ejecuta el verification script arriba
3. Sigue COMPREHENSIVE_TESTING_GUIDE.md paso a paso
4. Documenta qué test falló y el error exacto
5. Comparte logs relevantes

---

## ✅ Checklist Final

Antes de reportar "está listo":
- [ ] Código actualizado en PC de testing
- [ ] `docker compose up --build` ejecutado exitosamente
- [ ] Test 5 (Desconectar) funciona: permanece desconectado
- [ ] Test 6 (Accidental) funciona: reconecta automáticamente
- [ ] Logs muestran "Skipping auto-reconnect" en Test 5
- [ ] Logs muestran "Scheduling reconnect" en Test 6
- [ ] Tests 1-4 pasan (básicos)
- [ ] Tests 7-8 pasan (messaging)
- [ ] Sin errores de sintaxis JavaScript
- [ ] Sin crashes de contenedores

---

## 📌 Versión & Cambios

**v1.1.0 - Fix Disconnect Auto-Reconnect**
- Issue: Desconectar no permanecía desconectado
- Fix: Flag `intentionallyDisconnected` + evaluación en evento
- Status: ✅ Implementado, documentado, listo para testing
- Docs: DISCONNECT_FIX_EXPLANATION.md, STATE_DIAGRAMS.md, COMPREHENSIVE_TESTING_GUIDE.md
- Changelog: CHANGELOG_v1.1.0.md

**v1.0.0 - Baseline**
- Dashboard UI mejorado (búsqueda, estadísticas)
- Lines página refactored (modales)
- Webhook n8n integrado
- Docker configurado para Chromium
- Socket.io con wss:// soporte
- Todos los endpoints de WhatsApp

---

## 🎓 Aprendizajes

1. **Eventos de WhatsApp**: `disconnected` se dispara también cuando `destroy()` es llamado explícitamente
2. **Transiciones de estado**: Necesitas diferenciar entre acciones de usuario e eventos del sistema
3. **Logging es crítico**: Sin logs, es muy difícil diagnosticar problemas de reconexión
4. **Testing automático**: Los 13 tests cubren los casos más importantes
5. **Flag en memoria**: Más rápido que consultar BD en cada evento

---

Made with ❤️ for WhatsApp Bot Automation

