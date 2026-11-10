# ADR 0005 — Internacionalización (español / inglés)

**Estado:** aceptada · **Fecha:** 2026-11-10

## Contexto

La interfaz y los mensajes de la API estaban solo en español. Para una base reutilizable en otros países (y legible para quien evalúa el proyecto) hace falta al menos inglés, sin duplicar pantallas.

## Decisión

**Frontend** (i18next + react-i18next):
- Estilo gettext: el texto en español es la clave y `src/i18n/en.ts` lo traduce. El código se lee en el idioma original y una traducción faltante muestra el español, nunca un identificador.
- Los componentes base (`Field`, `PageHeader`, `Button`, `Th`, `Badge`, etc.) traducen sus textos; los textos definidos fuera de un componente se marcan con `tk()`.
- Números, monedas y fechas se formatean con `Intl` según el idioma elegido.
- El idioma se guarda en el navegador y viaja al backend en el header `Accept-Language`.
- `src/i18n/coverage.test.ts` falla si queda texto visible sin marcar, si falta una traducción o si una traducción pierde una variable.

**Backend** (Spring `MessageSource`):
- Los errores de negocio llevan un código (`error.category.inUse`) y se traducen con `messages.properties` / `messages_en.properties` según `Accept-Language` (español por defecto).
- La respuesta RFC 9457 incluye `code`, estable entre idiomas, para que un cliente pueda reaccionar a un error sin depender del texto.
- Las validaciones de Bean Validation usan los mensajes localizados de Hibernate Validator.

**Datos:** el detalle de auditoría se guarda sin idioma (nombres, SKU, cantidades y códigos como `OUT`); la interfaz traduce los códigos al mostrarlo. Los datos que carga el usuario (nombres de productos, unidades, almacenes) no se traducen.

## Consecuencias

- Agregar un idioma: un diccionario en el frontend, un `messages_xx.properties` y sumarlo a la lista de idiomas.
- El test de cobertura obliga a traducir cada texto nuevo en el mismo cambio.
