# Puente Studio — Dev Kit

Kit de desarrollo local para crear y gestionar aplicaciones web dentro de **Puente OS**.  
Incluye scripts Node.js para bajar y subir artefactos, y la documentación completa del agente en [`skill_puente_studio.md`](./skill_puente_studio.md).

---

## Requisitos

- Node.js 14+ (sin dependencias externas)
- Cuenta activa en [app.puente.xyz](https://app.puente.xyz)
- Una **Platform API Key** (`puente_studio_xxx`) generada desde Configuración

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
BASE_URL=https://puente-backend-721178029791.southamerica-west1.run.app/
STUDIO_KEY=puente_studio_xxxxxxxxxxxxxxxxxxxx
```

---

## Estructura del repositorio

```
puente_studio_repo/
├── .env.example              ← Plantilla de variables de entorno
├── .env                      ← Tu configuración local (no commitear)
├── README.md                 ← Este archivo
├── skill_puente_studio.md    ← Documentación completa del agente
└── APP/
    ├── files/                ← Archivos fuente de la app (editar aquí)
    ├── json_result/          ← JSONs de salida (generados)
    ├── output.json           ← JSON listo para subir a la API
    ├── pull_artefacto.js     ← ⬇️  API → archivos locales
    └── files_to_json.js      ← ⬆️  Archivos locales → JSON de la API
```

---

## Flujo de trabajo

### Editar una app existente

```bash
# 1. Bajar el artefacto por ID
node APP/pull_artefacto.js <id>

# 2. Editar los archivos en APP/files/
#    (index.tsx, App.tsx, components/, etc.)

# 3. Convertir archivos a JSON
node APP/files_to_json.js

# 4. Subir los cambios
curl -X PUT "$BASE_URL/studio/artefactos/<id>" \
  -H "X-API-Key: $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d @APP/output.json
```

> ⚠️ El PUT **reemplaza todo el `app_content`**. Siempre usa el flujo GET → editar → PUT completo. Nunca subas solo los archivos modificados.

### Crear una app nueva

```bash
curl -X POST "$BASE_URL/studio/artefactos" \
  -H "X-API-Key: $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Mi App",
    "descripcion": "Descripción opcional",
    "app_content": { ... }
  }'
```

Guarda de inmediato el `id` y la `api_key` de la respuesta — **la key solo se muestra una vez**.

---

## Scripts

### `pull_artefacto.js` — Bajar una app

Descarga el `app_content` de un artefacto y escribe los archivos localmente.

```bash
node APP/pull_artefacto.js <artefacto_id> [directorio_salida]

# Ejemplos
node APP/pull_artefacto.js 547
node APP/pull_artefacto.js 547 ./APP/files
node APP/pull_artefacto.js 547 ./APP/mi-backup
```

Usa `STUDIO_KEY` y `BASE_URL` del archivo `.env`.

---

### `files_to_json.js` — Preparar archivos para subir

Convierte el directorio `APP/files/` en un JSON compatible con el campo `app_content` de la API.

```bash
node APP/files_to_json.js [directorio_entrada] [archivo_salida]

# Ejemplos
node APP/files_to_json.js                                     # APP/files → APP/output.json
node APP/files_to_json.js ./APP/files ./APP/output.json
```

El JSON generado tiene la forma:
```json
{
  "index.tsx":            { "content": "...", "type": "tsx" },
  "App.tsx":              { "content": "...", "type": "tsx" },
  "components/Vista.tsx": { "content": "...", "type": "tsx" }
}
```

---

## Autenticación

| Contexto | Header | Credencial |
|---|---|---|
| Gestión (scripts, agente) | `X-API-Key` | `STUDIO_KEY` (`puente_studio_xxx`) |
| Frontend de la app publicada | `X-API-Key` | API Key del artefacto (`puente_art_xxx`) |

> 🔐 Nunca uses la `STUDIO_KEY` dentro del código de una app publicada.

---

## URLs de una app publicada

| URL | Uso |
|---|---|
| `https://app.puente.xyz/public/{public_id}/` | Link para el usuario final |
| `{BASE_URL}/studio/artefactos/{id}` | API privada (gestión) |
| `{BASE_URL}/public/artefacto/{id}/tablas/{tabla_id}/datos` | API pública (frontend de la app) |

---

## Referencia rápida de endpoints

| Acción | Método | Endpoint |
|---|---|---|
| Listar apps | GET | `/studio/artefactos` |
| Obtener app | GET | `/studio/artefactos/{id}` |
| Crear app | POST | `/studio/artefactos` |
| Actualizar app | PUT | `/studio/artefactos/{id}` |
| Metadatos (public_id) | GET | `/studio/artefactos/{id}/meta` |
| Listar tablas | GET | `/studio/tablas` |
| Crear tabla | POST | `/studio/tablas` |
| Leer filas | GET | `/studio/tablas/{tabla_id}/datos` |
| Insertar fila | POST | `/studio/tablas/{tabla_id}/datos` |
| Bulk insert | POST | `/studio/tablas/{tabla_id}/datos/bulk` |
| Ver API key | GET | `/studio/artefactos/{id}/api-key` |
| Regenerar API key | POST | `/studio/artefactos/{id}/api-key/regenerate` |
| Conceder acceso a tabla | POST | `/studio/artefactos/{id}/tablas-acceso` |
| Revocar acceso | DELETE | `/studio/artefactos/{id}/tablas-acceso/{tabla_id}` |

Documentación completa → [`skill_puente_studio.md`](./skill_puente_studio.md)
