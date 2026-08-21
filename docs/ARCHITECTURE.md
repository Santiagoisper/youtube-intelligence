# Arquitectura

Next.js App Router aloja UI y futuros endpoints. El dominio está separado por etapas del pipeline (`core/`); los servicios adaptan proveedores externos y `schemas/` valida los límites en runtime. Prisma es la única capa ORM elegida: ofrece migraciones, tipos generados y relaciones explícitas sobre PostgreSQL sin introducir otra abstracción.

El pipeline futuro debe avanzar por contratos, persistiendo cada artefacto antes de pasar al siguiente. La UI actual usa fixtures y no llama a YouTube ni a un LLM. No se agregan vector DB, colas ni microservicios hasta que una necesidad observable lo justifique.