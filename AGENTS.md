# Puente Studio repository instructions

## Repository purpose

This repository contains the Puente Studio development kit and native Agent Skills for Claude Code and Codex.

## Skill routing

- Use `puente-studio` for work involving Puente applications, artifacts, tables, integrations, local development, validation, or publication.
- Use `manage-puente-workflows` for work involving workflow definitions, nodes, edges, versions, activation, schedules, or webhooks.
- Use `manage-puente-projects` for work involving projects, workspace folders, grouping components into a project, or a project's Kanban task board.
- Read the selected skill completely before acting.
- When a task involves both areas, load both skills.

## Mirrored skill copies

- Claude Code skills live under `.claude/skills/` and are the production copies.
- Codex skills live under `.agents/skills/`.
- Both directories contain real files. Do not use symlinks and do not create a root `skills/` directory.
- Keep matching Claude Code and Codex skill directories byte-identical.
- Whenever a skill changes, apply the same change to both copies and verify that they remain identical.

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
├── .claude/skills/              ← Claude Code production skill copies
│   ├── puente-studio/
│   ├── manage-puente-workflows/
│   └── manage-puente-projects/
├── .agents/skills/              ← Codex skill copies
│   ├── puente-studio/
│   ├── manage-puente-workflows/
│   └── manage-puente-projects/
└── app/
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
node app/pull_artefacto.js <id>

# 2. Edit files under app/files/
#    (index.tsx, App.tsx, components/, etc.)

# 3. Convert the files to JSON
node app/files_to_json.js

# 4. Upload the changes (always by group_id, never by the numeric id)
curl -X PUT "$BASE_URL/studio/artefactos/group/<group_id>" \
  -H "X-API-Key: $STUDIO_KEY" \
  -H "Content-Type: application/json" \
  -d @app/output.json
```

The PUT replaces the complete `app_content`. Always follow GET → edit → complete PUT. Never upload only the modified files.

`PUT /studio/artefactos/group/{group_id}` is the only update endpoint. The numeric `id` identifies a single version row and changes with every push; `artefacto_group_id` is stable. `pull_artefacto.js` prints the `group_id`, and `GET /studio/artefactos/{id}/meta` returns it.

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
node app/pull_artefacto.js <artefacto_id> [output_directory]

node app/pull_artefacto.js 547
node app/pull_artefacto.js 547 ./app/files
node app/pull_artefacto.js 547 ./app/mi-backup
```

Use `STUDIO_KEY` and `BASE_URL` from `.env`.

### `files_to_json.js`

Convert `app/files/` into JSON compatible with the API `app_content` field.

```bash
node app/files_to_json.js [input_directory] [output_file]

node app/files_to_json.js
node app/files_to_json.js ./app/files ./app/output.json
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
| `{BASE_URL}/studio/artefactos/group/{group_id}` | Private management API |
| `{BASE_URL}/public/artefacto/{id}/tablas/{tabla_id}/datos` | Public application data API |

## Endpoint quick reference

| Action | Method | Endpoint |
|---|---|---|
| List applications | GET | `/studio/artefactos` |
| Get application (current version) | GET | `/studio/artefactos/group/{group_id}` |
| Get application (specific version) | GET | `/studio/artefactos/{id}` |
| Create application | POST | `/studio/artefactos` |
| Update application (only update endpoint) | PUT | `/studio/artefactos/group/{group_id}` |
| Get metadata and `public_id` | GET | `/studio/artefactos/{id}/meta` |
| Update `slug` / `sharing_mode` | PUT | `/studio/artefactos/{id}/meta` |
| List tables | GET | `/studio/tablas` |
| Create table | POST | `/studio/tablas` |
| Get table column structure | GET | `/studio/tablas/{tabla_id}/estructura` |
| **Migrate table schema (destructive)** | PUT | `/studio/tablas/{tabla_id}/estructura` |
| Read rows | GET | `/studio/tablas/{tabla_id}/datos` |
| Insert row | POST | `/studio/tablas/{tabla_id}/datos` |
| Bulk insert | POST | `/studio/tablas/{tabla_id}/datos/bulk` |
| View API key | GET | `/studio/artefactos/{id}/api-key` |
| Regenerate API key | POST | `/studio/artefactos/{id}/api-key/regenerate` |
| Grant table access | POST | `/studio/artefactos/{id}/tablas-acceso` |
| Revoke table access | DELETE | `/studio/artefactos/{id}/tablas-acceso/{tabla_id}` |

## Projects and tasks

These endpoints hang off `/proyectos`, **not** `/studio/proyectos`. The Studio key
creates, edits and organizes but never deletes: the three DELETE routes reject it
with 401 by design, and deletion happens in the web interface. To take a component
out of a project, move it with `proyecto_id_destino: null` instead.

| Action | Method | Endpoint |
|---|---|---|
| Workspace overview (components + tasks) | GET | `/proyectos/all_components` |
| List projects | GET | `/proyectos` |
| Create project | POST | `/proyectos` |
| Update project | PUT | `/proyectos/{proyecto_id}` |
| List tasks | GET | `/proyectos/{proyecto_id}/tareas` |
| Create task | POST | `/proyectos/{proyecto_id}/tareas` |
| Update task | PUT | `/proyectos/{proyecto_id}/tareas/{tarea_id}` |
| Move task on the board | PUT | `/proyectos/{proyecto_id}/tareas/{tarea_id}/estado` |
| Assign components | POST | `/proyectos/{proyecto_id}/componentes` |
| Move or unassign a component | PUT | `/proyectos/componentes/mover` |
| **Delete project, task, or assignment** | — | Not available with `STUDIO_KEY` |
