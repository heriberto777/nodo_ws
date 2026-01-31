# Integración con n8n

## Webhooks
- Inbound: POST /api/webhooks/n8n/inbound
- Status: POST /api/webhooks/n8n/status

## Autenticación
Enviar header x-api-key con la API Key configurada en el backend.

## Payload recomendado
- lineId
- from
- to
- body
- timestamp
