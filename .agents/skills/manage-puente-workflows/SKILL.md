---
name: manage-puente-workflows
description: Manage Puente workflow definitions from puente_studio_repo with the repository STUDIO_KEY. Use when an external Puente Studio user needs to list or inspect workflows, create a draft workflow, create a complete new version, or change a saved workflow version's status. Disclose automatic webhook and scheduling side effects, require explicit activation confirmation, and never call workflow run endpoints.
---

# Manage Puente Workflows

Manage saved workflow definitions for the team attached to the repository's Studio credential. Do not directly call workflow execution, trigger, webhook, schedule, or deletion endpoints. Account for lifecycle side effects performed automatically by the Puente API during definition writes.

## Read configuration

Use `BASE_URL` and `STUDIO_KEY` from the `puente_studio_repo/.env` file. Stop if the file is missing, either value is missing, or either value still contains its angle-bracket placeholder from `.env.example`.

Authenticate every request with:

```http
X-API-Key: <STUDIO_KEY>
```

Never print the key, place it in a URL, write it into generated source code, or include it in reports.

## Load the contract

Read [references/api.md](references/api.md) before preparing a request. Read [references/nodes.md](references/nodes.md) before creating or changing `nodes`, `edges`, node inputs, or cross-node references. Use only the public HTTP methods and paths documented in those references.

## Choose an operation

- List saved workflows: call `GET /workflows/`.
- Inspect a version or stable group: call `GET /workflows/?all_versions=true` and filter the returned definitions by `id` or `scenario_group_id`.
- Discover valid node types: call `GET /workflows/integrations`.
- Create a workflow: call `POST /workflows/` with a complete JSON definition and acknowledged automatic service effects.
- Update a definition: call `POST /workflows/` with the stable `scenario_group_id`, a complete JSON definition, and acknowledged automatic service effects.
- Change saved status: call `PUT /workflows/{scenario_id}/status` with a version `id`; activating requires separate explicit confirmation.
- Delete or run a workflow: state that the operation is outside this skill and do nothing.

## Before changing a definition

1. Inspect the current saved definition through `GET /workflows/?all_versions=true`.
2. Validate every `node_id` through `GET /workflows/integrations`; never invent node types.
3. Preserve the complete `nodes` and `edges` arrays when creating a new version.
4. Default new definitions and versions to `draft` unless the user explicitly requests another saved status.
5. Explain that `POST /workflows/` automatically generates or inherits synchronous-webhook metadata, inherits scheduling metadata on new versions, and attempts Hookdeck webhook provisioning.
6. Obtain explicit user confirmation of those effects before sending a create/version request.
7. If any create/version payload uses `status: "active"`, obtain separate explicit confirmation of activation.
8. Show the intended HTTP method, path, and JSON body without sending it when the requested change is ambiguous or needs confirmation.
9. Send the mutation once. If the response is interrupted, read the saved state instead of retrying automatically.
10. Read the saved definition back and verify identifiers, version, team, and status.

This is the concrete behavior previously described as “guard writes”: inspect, preview when needed, write once, and verify. It is an agent safety procedure, not an API feature.

## Preserve version semantics

Treat `scenario_group_id` as the stable workflow identity and `id` as one saved version.

- Omit `scenario_group_id` to create a new workflow at version 1.
- Include the existing `scenario_group_id` to create the next version.
- Send every node and edge on each new version; never send a partial patch.
- Save both identifiers from the response.
- Expect the new version to have `is_latest=true`.

The Studio credential is bound to one team. Omit `equipo_id` to use that team. Never attempt another team ID.

## Distinguish management from execution

Do not directly call workflow execution, trigger, webhook, cron, schedule, or run endpoints.

Definition management can still change runtime eligibility:

- Creating or versioning causes the automatic webhook and metadata behavior described above.
- Saving `status: "active"` does not execute immediately, but it enables existing external triggers, synchronous webhooks, or schedules to execute that workflow.

Require explicit user confirmation for every transition or create/version payload that saves an active status. Never describe activation as inert metadata.

## Report results

Report the HTTP outcome and these non-secret fields:

- `id`
- `scenario_group_id`
- `version`
- `is_latest`
- `status`
- `equipo_id`

Preserve API error status and detail. Do not expose request headers or credentials.
