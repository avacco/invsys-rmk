# Invsys

Sistema de gestión de inventario: catálogo de productos, stock por almacén basado en movimientos, proveedores, y usuarios con roles y permisos.

Proyecto de portfolio. Es una **base general y neutral respecto del país**: no implementa reglas fiscales ni regulatorias, pero está diseñado para que puedan agregarse como módulos (ver [ADR 0001](docs/adr/0001-monorepo-y-monolito-modular.md)).

## Funcionalidades

- **Sesión segura:** JWT en cookies httpOnly, refresh tokens rotativos con detección de reutilización ([ADR 0004](docs/adr/0004-sesion-con-cookies-httponly.md)).
- **Roles y permisos** `recurso:operación`, aplicados en cada endpoint y reflejados en la interfaz.
- **Productos:** SKU, categoría, unidad de medida, proveedor, costo, precio de venta, stock mínimo, imagen. Búsqueda, filtros, orden, paginación, vista de tarjetas o tabla y exportación CSV.
- **Stock por almacén basado en movimientos** ([ADR 0003](docs/adr/0003-stock-basado-en-movimientos.md)): entradas, salidas, ajustes por conteo y transferencias. El historial es inmutable, el saldo nunca queda negativo (bloqueo de fila ante operaciones simultáneas) y las cantidades respetan los decimales de cada unidad.
- **Alertas de stock bajo:** filtro de productos bajo su mínimo, resumen en el inicio y un evento de dominio listo para enchufar notificaciones.
- **Inicio con indicadores reales:** valor del inventario al costo, productos con stock bajo, movimientos de la semana y últimos movimientos.
- **Categorías, unidades de medida, almacenes y proveedores** con validación de referencias (no se borra lo que está en uso).
- **Usuarios y roles** administrables desde la interfaz.
- **Auditoría básica:** cada registro guarda quién y cuándo lo creó y lo modificó, tomado de la sesión.
- **Modo demo sin backend:** el frontend se publica como sitio estático con una API simulada ([ADR 0002](docs/adr/0002-demo-frontend-sin-backend.md)).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Java 21, Spring Boot 3.5, Spring Security (resource server JWT), Spring Data JPA, Flyway, springdoc-openapi |
| Base de datos | PostgreSQL 17 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, TanStack Query, React Router, React Hook Form + Zod |
| Demo | MSW (Mock Service Worker) |
| Tests | JUnit 5 + Testcontainers, Vitest + Testing Library |
| CI/CD | GitHub Actions (tests + publicación de la demo en GitHub Pages) |

## Estructura

```
invsys/
├── backend/             API REST (Spring Boot)
│   └── src/main/java/com/invsys/
│       ├── identity/    usuarios, roles, permisos, autenticación
│       ├── catalog/     productos, categorías, unidades
│       ├── inventory/   almacenes, saldos y movimientos de stock
│       ├── partners/    proveedores
│       ├── storage/     almacenamiento de imágenes (intercambiable)
│       └── shared/      auditoría, errores, paginación
├── frontend/            SPA (React)
│   └── src/
│       ├── api/         cliente HTTP y tipos del contrato
│       ├── features/    una carpeta por pantalla
│       └── mocks/       backend simulado para la demo y los tests
├── docs/adr/            decisiones de arquitectura
└── docker-compose.yml   PostgreSQL + API para desarrollo
```

## Cómo correrlo

### Solo la demo (sin backend)

```bash
cd frontend
npm ci
npm run dev:demo        # http://localhost:3000
```

### Completo (con backend)

Requiere Docker y Node 20+.

```bash
docker compose up --build -d    # PostgreSQL + API en http://localhost:8080
cd frontend
npm ci
npm run dev                     # http://localhost:3000 (redirige /api al backend)
```

Usuarios de prueba (perfil `dev` y demo):

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin1234` | ADMIN — acceso total |
| `manager` | `manager1234` | MANAGER — catálogo, inventario y proveedores |
| `viewer` | `viewer1234` | VIEWER — solo lectura |

Documentación interactiva de la API: http://localhost:8080/api/docs/ui

### Variables de entorno del backend (producción)

| Variable | Descripción |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave para firmar los JWT (mínimo 32 caracteres) |
| `ADMIN_PASSWORD` | Contraseña del usuario `admin` que se crea si la base está vacía |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma (si el frontend está en otro dominio) |
| `COOKIE_SECURE` | `true` (por defecto) exige HTTPS para las cookies |
| `INVSYS_CURRENCY` | Código ISO 4217 de la moneda (por defecto `USD`) |
| `STORAGE_DIR` | Carpeta donde se guardan las imágenes |

## Tests

```bash
cd backend && ./mvnw verify      # requiere Docker (Testcontainers)
cd frontend && npm test
```

## Hoja de ruta

- [x] **Fase 0 — Base:** monorepo, entorno local, ADRs
- [x] **Fase 1 — Identity y catálogo:** autenticación, permisos, catálogo, proveedores, usuarios, demo, CI
- [x] **Fase 2 — Inventario:** almacenes, stock por almacén, movimientos y transferencias, alertas de stock bajo
- [ ] **Fase 3 — Visibilidad:** registro de auditoría completo, reportes, i18n (es/en)
- [ ] **Fase 4 — Vidriera:** tests E2E, capturas, documentación final
