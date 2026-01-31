# Plataforma de Automatización WhatsApp (Full Stack)

## Resumen
Plataforma full stack para gestionar múltiples sesiones de WhatsApp, automatizar flujos con n8n y operar un panel administrativo en React. Preparada para producción con Docker, Redis y PostgreSQL.

## Arquitectura
- Frontend (React Admin Panel) → REST / WebSocket
- Backend API (Express MVC) → Session Manager → whatsapp-web.js
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

## Endpoints principales
- POST /api/auth/register
- POST /api/auth/login
- POST /api/messages/send
- GET /api/lines
- POST /api/lines
- POST /api/lines/:id/connect
- POST /api/lines/:id/disconnect
- PUT /api/lines/:id/webhook
- PUT /api/lines/:id/ratelimit
- POST /api/webhooks/n8n/inbound

## Documentación
Revisa las guías en doc/guides.
