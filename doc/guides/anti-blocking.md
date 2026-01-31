# Estrategia Anti-Bloqueo

## Principios
- Limitar volumen por línea
- Delays dinámicos y aleatorios
- Horarios de trabajo
- Warm-up progresivo

## Warm-up sugerido
- Día 1: 10-20 mensajes
- Día 2: 30-50 mensajes
- Día 7+: normal

## Rate-limit
- Mensajes/minuto, hora y día
- Rechazo controlado con HTTP 429
