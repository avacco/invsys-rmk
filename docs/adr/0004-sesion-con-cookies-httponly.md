# ADR 0004 — Sesión con JWT en cookies httpOnly y refresh tokens rotativos

**Estado:** aceptada · **Fecha:** 2026-11-10

## Contexto

La versión anterior guardaba los tokens en cookies, pero sin revocación real, con una lógica de login de tres ramas y sin aplicar los permisos en los endpoints.

## Decisión

- **Access token:** JWT firmado con HS256, de vida corta (15 min). Lleva el nombre de usuario, el rol y los permisos (claim `perms`). Viaja en la cookie `access_token` (httpOnly, SameSite=Strict).
- **Refresh token:** valor aleatorio opaco de 256 bits, vida de 7 días, en la cookie `refresh_token`, restringida a `/api/v1/auth`. En la base solo se guarda su hash SHA-256.
- **Rotación:** cada `POST /auth/refresh` revoca el token usado y emite uno nuevo. Si llega un token ya revocado (posible robo), se revocan todas las sesiones del usuario.
- **Autorización:** cada endpoint declara su permiso con `@PreAuthorize("hasAuthority('recurso:operación')")`. El frontend usa la misma lista para ocultar lo que el usuario no puede hacer, pero la decisión final siempre es del backend.
- **CSRF:** las cookies SameSite=Strict no se envían desde otros sitios, y CORS solo admite los orígenes configurados. En desarrollo el frontend usa el proxy de Vite (mismo origen).

## Consecuencias

- JavaScript nunca accede a los tokens (mitiga XSS).
- Un cambio de permisos se aplica a lo sumo al vencer el access token (15 min) o al cambiar la contraseña, que revoca las sesiones.
