# Invsys

Sistema de gestión de inventario: catálogo de productos, stock por almacén basado en movimientos, proveedores, usuarios con roles y permisos, auditoría y dashboard.

Proyecto de portfolio. Es una **base general y neutral respecto del país**: no implementa reglas fiscales ni regulatorias, pero está diseñado para que puedan agregarse como módulos.

> 🚧 **En reconstrucción.** Ver la [hoja de ruta](#hoja-de-ruta).

## Estructura

```
invsys/
├── backend/            # API REST — Spring Boot (fase 1)
├── frontend/           # SPA — React + TypeScript + Vite (fase 1)
├── docs/adr/           # Registro de decisiones de arquitectura
└── docker-compose.yml  # Entorno local (PostgreSQL)
```

## Stack previsto

| Capa | Tecnología |
|---|---|
| Backend | Java 21 LTS, Spring Boot, Spring Security, Spring Data JPA, Flyway, springdoc-openapi |
| Base de datos | PostgreSQL |
| Frontend | React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router |
| Demo sin backend | MSW (Mock Service Worker) |
| Tests | JUnit 5 + Testcontainers, Vitest, Playwright |
| CI | GitHub Actions |

## Desarrollo local

```bash
cp .env.example .env
docker compose up -d db
```

## Demo

El frontend se puede compilar en **modo demo**: un backend simulado (MSW) responde en el navegador con datos ficticios, así que se puede publicar como sitio estático sin desplegar la API. Ver [ADR 0002](docs/adr/0002-demo-frontend-sin-backend.md).

## Hoja de ruta

- [x] **Fase 0 — Base:** monorepo, entorno local, ADRs
- [ ] **Fase 1 — Identity y catálogo:** auth con cookies httpOnly, permisos, CRUD de catálogo, cliente TS generado desde OpenAPI, CI
- [ ] **Fase 2 — Inventario:** almacenes, stock por almacén, movimientos y transferencias, alertas de stock bajo
- [ ] **Fase 3 — Visibilidad:** dashboard y auditoría reales, usuarios y proveedores, i18n (es/en)
- [ ] **Fase 4 — Vidriera:** demo publicada, capturas, documentación final
