# Puente Studio repository instructions

## Repository purpose

This repository contains the Puente Studio development kit and its canonical Agent Skills.

## Skill routing

- Use `puente-studio` for work involving Puente applications, artifacts, tables, integrations, local development, validation, or publication.
- Use `manage-puente-workflows` for work involving workflow definitions, nodes, edges, versions, activation, schedules, or webhooks.
- Read the selected skill completely before acting.
- When a task involves both areas, load both skills.

## Canonical skill source

- Canonical skills live under `skills/`.
- `.agents/skills/` and `.claude/skills/` contain discovery symlinks only.
- Edit skills only through their canonical directories under `skills/`.
- Never create separate Claude and Codex versions of the same skill.

## Credentials and safety

- Never read credentials aloud, print them in logs, or include them in commits, reports, prompts, or generated application code.

## Repository structure

```text
puente_studio_repo/
├── .env.example                 ← Environment variable template
├── .env                         ← Local configuration (never commit)
├── README.md                    ← Human-facing setup
├── AGENTS.md                    ← Shared agent instructions
├── CLAUDE.md                    ← Loads AGENTS.md
├── skills/
│   ├── puente-studio/             ← Primary Puente Studio skill
│   └── manage-puente-workflows/  ← Workflow-definition management
└── APP/
    ├── files/                   ← Application source files
    ├── json_result/             ← Generated JSON output
    ├── output.json              ← API-ready JSON
    ├── pull_artefacto.js        ← API to local files
    └── files_to_json.js         ← Local files to API JSON
```

## Application workflow

### Edit an existing application

```bash
# 1. Download the artifact by ID
node APP/pull_artefacto.js <id>

# 2. Edit files under APP/files/
#    (index.tsx, App.tsx, components/, etc.)

# 3. Convert the files to JSON
node APP/files_to_json.js

# 4. Upload the changes
curl -X PUT "$BASE_URL/studio/artefactos/<id>" \
  -H "X-API-Key: $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d @APP/output.json
```

The PUT replaces the complete `app_content`. Always follow GET → edit → complete PUT. Never upload only the modified files.

### Create a new application

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

Immediately preserve the response `id` and `api_key`. The key is displayed only once.

## Scripts

### `pull_artefacto.js`

Download an artifact's `app_content` and write its files locally.

```bash
node APP/pull_artefacto.js <artefacto_id> [output_directory]

node APP/pull_artefacto.js 547
node APP/pull_artefacto.js 547 ./APP/files
node APP/pull_artefacto.js 547 ./APP/mi-backup
```

Use `STUDIO_KEY` and `BASE_URL` from `.env`.

### `files_to_json.js`

Convert `APP/files/` into JSON compatible with the API `app_content` field.

```bash
node APP/files_to_json.js [input_directory] [output_file]

node APP/files_to_json.js
node APP/files_to_json.js ./APP/files ./APP/output.json
```

The generated JSON has this structure:

```json
{
  "index.tsx": { "content": "...", "type": "tsx" },
  "App.tsx": { "content": "...", "type": "tsx" },
  "components/Vista.tsx": { "content": "...", "type": "tsx" }
}
```

## Authentication

| Context | Header | Credential |
|---|---|---|
| Management scripts and agents | `X-API-Key` | `STUDIO_KEY` (`<puente_studio_placeholder>`) |
| Published application frontend | `X-API-Key` | Artifact API key (`puente_art_xxx`) |

Never use `STUDIO_KEY` inside published application source code.

## Published application URLs

| URL | Purpose |
|---|---|
| `https://app.puente.xyz/public/{public_id}/` | End-user application URL |
| `{BASE_URL}/studio/artefactos/{id}` | Private management API |
| `{BASE_URL}/public/artefacto/{id}/tablas/{tabla_id}/datos` | Public application data API |

## Endpoint quick reference

| Action | Method | Endpoint |
|---|---|---|
| List applications | GET | `/studio/artefactos` |
| Get application | GET | `/studio/artefactos/{id}` |
| Create application | POST | `/studio/artefactos` |
| Update application | PUT | `/studio/artefactos/{id}` |
| Get metadata and `public_id` | GET | `/studio/artefactos/{id}/meta` |
| List tables | GET | `/studio/tablas` |
| Create table | POST | `/studio/tablas` |
| Read rows | GET | `/studio/tablas/{tabla_id}/datos` |
| Insert row | POST | `/studio/tablas/{tabla_id}/datos` |
| Bulk insert | POST | `/studio/tablas/{tabla_id}/datos/bulk` |
| View API key | GET | `/studio/artefactos/{id}/api-key` |
| Regenerate API key | POST | `/studio/artefactos/{id}/api-key/regenerate` |
| Grant table access | POST | `/studio/artefactos/{id}/tablas-acceso` |
| Revoke table access | DELETE | `/studio/artefactos/{id}/tablas-acceso/{tabla_id}` |
