# Despliegue

Guía breve para llevar el sistema a producción en Linux. Incluye Docker o PM2 + Nginx. Los tests se ejecutan en otro servidor y no son parte del flujo aquí.

## Requisitos
- Linux (Ubuntu 22.04+ recomendado)
- Docker y Docker Compose **o** Node.js 18+ y PM2
- Postgres 14+ y Redis 6+
- Dominio + SSL (Let’s Encrypt)

## Variables de entorno
Crear backend/.env con valores reales y secretos fuera del repositorio:
- PORT
- NODE_ENV=production
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- API_KEY (si aplica)
- CORS_ORIGIN (dominio del frontend)
- N8N_WEBHOOK_URL (si aplica)
- ANTIBAN_MIN_DELAY_MS / ANTIBAN_MAX_DELAY_MS
- SAFE_MODE_DURATION_MS
- AUTO_KILL_BROWSER_LOCKS (true/false)

## Opción A: Docker (recomendado)
1) Configurar .env en backend.
2) Ajustar docker-compose.yml para apuntar al dominio y a los volúmenes persistentes.
3) Levantar los servicios con Docker Compose.
4) Verificar que el backend responde en /api/health y que el frontend carga.
5) Configurar Nginx como reverse proxy con SSL y redirigir HTTP→HTTPS.

**Frontend runtime config:** editar public/config.json en el servidor con apiUrl y wsUrl. Si está vacío en producción, aparecerá una pantalla de configuración inicial.
Para que el formulario escriba el archivo automáticamente, define FRONTEND_CONFIG_PATH en el backend (ruta absoluta al config.json) y opcionalmente CONFIG_WRITE_TOKEN.

**Persistencia:** Asegurar volúmenes para Postgres, Redis y .wwebjs_auth/.wwebjs_cache (sesiones WhatsApp).

## Opción B: PM2 + Nginx
1) Instalar dependencias en backend y frontend.
2) Compilar frontend y servir estáticos con Nginx.
3) Levantar backend con PM2 usando backend/ecosystem.config.cjs.
4) Configurar Nginx como reverse proxy hacia el backend y servir el frontend en /.

## Nginx (recomendado)
- Proxy a backend en /api y /socket.io
- Cache y compresión para frontend
- SSL con Let’s Encrypt
- Límites razonables (body size y timeouts)

## Base de datos
- Ejecutar migraciones/seed en un entorno controlado.
- Hacer backup diario de Postgres.
- Asegurar índices y mantenimiento (VACUUM/ANALYZE).

## Redis
- Usado para rate-limit y colas.
- Habilitar persistencia si es necesario.

## Seguridad
- No exponer Postgres/Redis a internet.
- Usar variables seguras y rotación de credenciales.
- Limitar orígenes en CORS.
- Activar firewall (ufw) y abrir solo 80/443.

## Observabilidad
- Revisar logs del backend y frontend.
- Activar rotación de logs.
- Monitoreo básico de CPU, RAM, disco y procesos (PM2 o Docker).

## Salud del sistema
- Endpoint /api/health
- Verificar WebSocket Socket.IO
- Validar envío/recepción WhatsApp en una línea de prueba

## Checklist rápido
- [ ] Variables en backend/.env
- [ ] Volúmenes persistentes
- [ ] SSL configurado
- [ ] Nginx proxy funcionando
- [ ] Backups configurados
- [ ] Monitoreo activo
