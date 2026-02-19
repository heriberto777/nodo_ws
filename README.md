# Plataforma de Automatización WhatsApp (Full Stack)

## Resumen
Plataforma full stack para gestionar múltiples sesiones de WhatsApp, automatizar flujos con n8n y operar un panel administrativo en React. Preparada para producción con Docker, Redis y PostgreSQL.

## Arquitectura
- Frontend (React Admin Panel) → REST / WebSocket
- Backend API (Express MVC) → Session Manager → whatsapp-web.js
- Cola de envíos salientes en Redis (BullMQ) consumida por cada nodo
- Integración n8n por Webhooks

## Estructura
- backend/: API, servicios, sesiones y logs
- frontend/: panel administrativo
- doc/: guías y scripts

## Inicio rápido (desarrollo)
1. Configura variables en backend/.env
2. Instala dependencias en backend y frontend
3. Ejecuta servicios con docker-compose
4. Ejecuta doc/scripts/seed-db.sql en PostgreSQL

Nota: en local usa REDIS_URL y DATABASE_URL con localhost; en Docker se sobreescriben automáticamente.

## Crear usuario administrador
Ejecuta el script en backend/scripts/create-admin.js con nombre, correo y contraseña.

## Seguridad
- API Key por header x-api-key (opcional para webhooks)
- JWT obligatorio para panel y API
- Roles: admin, operator, viewer
 - Registro de usuarios requiere JWT de admin (excepto primer usuario)
- Conexiones WebSocket requieren JWT válido o la misma x-api-key (se valida durante el handshake)
- El backend no arranca a menos que exista JWT_SECRET o API_KEY, y cada solicitud protegida debe traer uno de esos mecanismos
- El middleware de errores responde una sola vez y registra contexto (evita dobles envíos de headers)
- Coordinación multi-nodo mediante locks distribuidos en Redis (configurables con SESSION_LOCK_TTL_MS / SESSION_LOCK_ACQUIRE_TIMEOUT_MS / SESSION_LOCK_RETRY_DELAY_MS)
- Nodo actual identificado por NODE_ID (por defecto hostname) y ownership persistido en Redis (`session:owner:<lineId>`) con TTL configurable vía SESSION_OWNER_TTL_MS
- Envíos outbound se procesan mediante BullMQ; configura MESSAGE_QUEUE_NAME, MESSAGE_QUEUE_CONCURRENCY y MESSAGE_QUEUE_ATTEMPTS según tu carga

## Endpoints principales
- POST /api/auth/register
- POST /api/auth/login
- POST /api/messages/send
- Los mensajes salientes ahora se encolan: el endpoint responde 202 con `jobId` y el worker (BullMQ) realiza el envío y escribe el registro en la base de datos
- GET /api/messages/recent
- GET /api/messages/queue/stats (admin) → devuelve contadores BullMQ y estado del worker
- GET /api/lines
- POST /api/lines
- POST /api/lines/:id/connect
- POST /api/lines/:id/disconnect
- GET /api/lines/:id/settings
- PUT /api/lines/:id/webhook
- PUT /api/lines/:id/ratelimit
- PUT /api/lines/:id/settings
- DELETE /api/lines/:id
- POST /api/webhooks/n8n/inbound
- GET /api/health → responde estado del nodo, métricas del worker BullMQ y contadores de jobs

## Documentación
Revisa las guías en doc/guides.
