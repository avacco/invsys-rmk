# ADR 0002 — Demo del frontend sin backend

**Estado:** aceptada · **Fecha:** 2026-11-10

## Contexto

Hay pocas opciones gratuitas para alojar un backend Spring Boot con base de datos. La demo de portfolio tiene que estar siempre disponible.

## Decisión

El frontend tiene un **modo demo** que intercepta las peticiones con MSW (Mock Service Worker) y responde con datos ficticios persistidos en el navegador. Se compila con `npm run build:demo` y se publica como sitio estático (GitHub Pages, Netlify, Vercel, etc.).

- Los handlers simulados implementan el mismo contrato OpenAPI que el backend real, con los mismos códigos de error.
- Servicios y vistas no saben si están en modo demo: el mismo código corre contra la API real o contra la simulada.
- El código de MSW solo entra en el build de demo.

## Consecuencias

- Cada endpoint nuevo necesita su handler simulado. Los tipos generados desde OpenAPI ayudan a detectar handlers desactualizados.
- El backend real se puede desplegar opcionalmente, pero la demo no depende de él.
