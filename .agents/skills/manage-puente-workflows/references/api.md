# Puente Studio workflow-definition contract

## Contents

- Scope
- Configuration and authentication
- Available actions
- Payloads
- Node definitions
- Definition-management flows
- Errors and safety

## Scope

Manage saved workflow definitions only. Never directly call workflow execution, trigger, webhook, cron, schedule, or deletion endpoints. Definition writes have automatic backend lifecycle side effects documented below.

## Configuration and authentication

Read the repository root `.env`:

```env
BASE_URL=<base_url>
STUDIO_KEY=<puente_studio_placeholder>
```

Send `X-API-Key: <STUDIO_KEY>` on every request. The credential selects and restricts the team. Omit `equipo_id` unless the API payload requires it; if supplied, it must be the credential's team.

## Available actions

| Action | Method and path | Notes |
|---|---|---|
| Integration catalog | `GET /workflows/integrations` | Use to discover valid `node_id` values and their public input schemas. |
| Create Google Sheets link | `POST /studio/integrations/google-sheets/connect-link` | Returns only `connection_id`, `connect_link`, and `expires_at`. Never include a team ID. |
| List Google Sheets connections | `GET /studio/integrations/connections?provider=google-sheets` | Returns public connection records for the credential's team. |
| Read Google Sheets connection | `GET /studio/integrations/connections/{connection_id}` | Check status after the user replies Done. |
| Verify Google Sheet access | `POST /studio/integrations/connections/{connection_id}/verify` | Send one literal spreadsheet URL; reference probes do not alter credential status. |
| List definitions | `GET /workflows/` | Latest version per group by default. |
| List version history | `GET /workflows/?all_versions=true` | Used to inspect a version or group locally. |
| Create definition | `POST /workflows/` | Omit `scenario_group_id`; acknowledge automatic service effects. |
| Create updated version | `POST /workflows/` | Include `scenario_group_id`, the complete definition, and acknowledged side effects. |
| Change saved status | `PUT /workflows/{scenario_id}/status` | Use a version ID; activation requires explicit confirmation. |

No other workflow action is part of this skill.

The Google Sheets endpoints are Studio-key-only. Never substitute a JWT, pass
`equipo_id`, log a connect link, or expose a Nango session token or identifier.

## Node definitions

Read [nodes.md](nodes.md) for the external node contract, public catalog fields, dynamic node-type discovery, inputs, references, and edges. Always use the live integrations response as the source of truth for available `node_id` values and their `input_schema`.

## Payloads

### Create or version

```json
{
  "nombre": "Example workflow",
  "descripcion": "Optional description",
  "nodes": [
    {
      "label": "selected_action",
      "node_id": "<node-id-from-integrations>",
      "inputs": {},
      "on_error": "stop",
      "position": {"x": 200, "y": 0},
      "index_position": 1
    }
  ],
  "equipo_id": null,
  "status": "draft",
  "scenario_group_id": null,
  "edges": [],
  "current_scenario_id": null
}
```

Required fields are `nombre` and `nodes`. Saved statuses are `draft`, `active`, and `inactive`.

Each node accepts:

- `label`: base label.
- `node_id`: value returned by integrations.
- `inputs`: node-specific object.
- `on_error`: normally `stop` or `continue`.
- `position`: optional visual coordinates.
- `index_position`: optional canvas index used to construct references and edge endpoints.

The compatible context-key convention from the supplied guide is `label_index_position` when an index exists, otherwise `label`. Edges connect those context keys. Validate node IDs against the integrations response.

### Saved status

```json
{"status": "active"}
```

### Response identity

Important fields:

```text
id, scenario_group_id, version, is_latest, nombre, descripcion,
nodes, edges, status, equipo_id, created_by_user_id, created_at, updated_at
```

## Definition-management flows

### List

```http
GET /workflows/?all_versions=false
X-API-Key: ...
```

Use `all_versions=true` only when version history or local item filtering is needed.

### Inspect a saved version or group

Request all versions, then:

1. Match `id` for a specific saved version.
2. Otherwise match `scenario_group_id`.
3. For a group match, choose `is_latest=true` unless all versions were requested.

### Create

Send the complete definition with `scenario_group_id` absent or `null`. Record the returned `id` and generated `scenario_group_id`.

The Puente service also:

- generates a `sync_webhook_id` for a new workflow;
- attempts Hookdeck webhook provisioning and may persist `webhook_url`;
- can therefore create external webhook state even though this skill calls only the definition endpoint.

Explain these effects and obtain explicit user confirmation before sending the request.

### Update by versioning

There is no partial definition update.

1. Inspect the latest complete saved definition.
2. Copy `nombre`, `descripcion`, `nodes`, `edges`, and `status` into a new payload.
3. Set `scenario_group_id` to the existing stable group ID.
4. Apply the requested edits.
5. Explain that the new version inherits `sync_webhook_id` and scheduling metadata from the prior version and that the service attempts Hookdeck provisioning for the new version.
6. Obtain explicit user confirmation of the automatic service effects.
7. POST the complete payload once.
8. Verify that `version` increased and `is_latest` is true.

### Change saved status

Use the saved version `id`. Activating one version causes other active versions in the same group to become inactive.

Activation does not run the workflow immediately. It does make the workflow eligible for execution through existing external triggers, synchronous webhooks, or schedules. Require separate explicit user confirmation before saving `active`, including when `active` appears in a create/version payload.

## Errors and safety

- `401`: the Studio credential is missing, invalid, revoked, or not accepted.
- `403`: the operation attempts a resource outside the credential's team.
- `404`: the requested saved definition cannot be found through the available list data.
- `422`: the payload shape is invalid.

Never print the Studio credential or persist it outside the repository's ignored `.env`. Do not automatically retry create, version, or status mutations after a network interruption.
