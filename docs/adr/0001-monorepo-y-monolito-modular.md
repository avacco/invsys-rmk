# ADR 0001 — Monorepo y monolito modular

**Estado:** aceptada · **Fecha:** 2026-11-10

## Contexto

La versión anterior estaba en dos repositorios (backend y frontend) que se desincronizaron: rutas distintas y parámetros obligatorios que el frontend no enviaba. El backend estaba organizado por capa técnica (controller/service/repository), lo que mezclaba dominios.

## Decisión

- Un solo repositorio con `backend/` y `frontend/`.
- El backend es un **monolito modular** organizado por dominio: `catalog`, `inventory`, `partners`, `identity`, `audit`. Los módulos se comunican mediante eventos de dominio (p. ej. `StockMoved`), de modo que módulos futuros (compras, ventas, facturación, reglas de un país) puedan agregarse escuchando eventos sin modificar los existentes.
- El contrato de la API se define con OpenAPI y el cliente TypeScript se genera a partir de él.

## Consecuencias

- Un cambio de contrato rompe la compilación del frontend en el mismo commit, en lugar de fallar en producción.
- Una sola URL de repositorio y un solo pipeline de CI.
