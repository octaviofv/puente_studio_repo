# Puente Studio — Dev Kit

Kit de desarrollo local para crear y gestionar aplicaciones web dentro de **Puente OS**.  
Incluye scripts Node.js para bajar y subir artefactos.

Para documentación de agentes, revisa [`AGENTS.md`](./AGENTS.md).

---

## Requisitos

- Node.js 14+ (sin dependencias externas)
- Cuenta activa en [app.puente.xyz](https://app.puente.xyz)
- Una **Platform API Key** generada desde Configuración

---

## Setup

```bash
# 1. Clona el repo
git clone <url-del-repo>
cd puente_studio_repo

# 2. Crea tu archivo de entorno
cp .env.example .env
```

Edita `.env` y completa tu `STUDIO_KEY`:

```env
BASE_URL=<base_url>
STUDIO_KEY=<puente_studio_placeholder>
```
