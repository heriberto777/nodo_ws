# Arquitectura General

## Componentes
- Backend Express (MVC)
- Session Manager con whatsapp-web.js
- Redis para rate-limit y colas
- PostgreSQL para persistencia
- Panel React con Socket.IO
- n8n para automatización

## Flujo
Frontend → API → Session Manager → WhatsApp Web

## Estados de Sesión
CREATED | QR | CONNECTED | DISCONNECTED | BLOCKED
