# Puente workflow nodes

## Contents

- Public source of truth
- Discover node types
- Catalog response
- Saved node shape
- Inputs and references
- Edges
- Safe authoring

## Public source of truth

External Puente Studio users discover nodes through the authenticated public API:

```http
GET /workflows/integrations
X-API-Key: <STUDIO_KEY>
```

Read `BASE_URL` and `STUDIO_KEY` from the repository `.env`. Send the Studio Key as `X-API-Key`. No backend repository, database access, user login, or bearer token is required.

The integrations response is the only source of truth for:

- currently available `node_id` values;
- the node `type` and display `category`;
- supported inputs, defaults, options, and required fields;
- node catalog versions and display metadata.

Never depend on internal backend code, migrations, database rows, private templates, or hard-coded node lists. Never invent a `node_id` or an input field.

## Discover node types

Node types are dynamic. Read them from the current integrations response instead of maintaining a fixed list in this skill.

For example, an external user may retrieve and summarize the public response with standard HTTP and JSON tools:

```bash
curl -fsS "${BASE_URL%/}/workflows/integrations" \
  -H "Accept: application/json" \
  -H "X-API-Key: $STUDIO_KEY" |
  jq 'sort_by(.type, .category, .app_name) | group_by(.type) | map({type: .[0].type, nodes: map({node_id, app_name, action_name, category})})'
```

Choose a node by its `node_id`, `app_name`, `action_name`, `type`, and `category`. Do not infer unsupported behavior from the type name alone. Read its `input_schema` before constructing `inputs`.

## Catalog response

Each public catalog item has this shape:

```json
{
  "node_id": "<catalog-node-id>",
  "app_name": "<application name>",
  "action_name": "<action name>",
  "type": "<catalog type>",
  "category": "<display category>",
  "icon_url": "https://...",
  "background_color": "#FFFFFF",
  "version": 1,
  "input_schema": [
    {
      "name": "<input-name>",
      "type": "string",
      "label": "<display label>",
      "required": true
    }
  ]
}
```

Common `input_schema` metadata includes:

- `name`: exact key to place in the saved node's `inputs` object;
- `type`: expected input kind;
- `required`: whether a value is required;
- `default`: value to use when the user has not supplied one;
- `options`: allowed choices for dropdown-like inputs;
- `label` and `description`: user-facing guidance;
- conditional display metadata when one field depends on another.

Only use fields present in the returned schema. Internal implementation fields are intentionally unavailable through this interface.

## Saved node shape

Create a new saved node from public catalog data with:

```json
{
  "label": "selected_action",
  "node_id": "<node_id-from-integrations>",
  "inputs": {
    "<schema-field-name>": "<user-supplied-value>"
  },
  "on_error": "stop",
  "position": {"x": 400, "y": 0},
  "index_position": 1
}
```

| Field | External contract |
|---|---|
| `label` | Stable name used to identify this node inside the workflow. |
| `node_id` | Exact identifier returned by `integrations`. |
| `inputs` | Object constructed only from the selected node's current `input_schema`. |
| `on_error` | Use `stop` by default. Use `continue` only when the user explicitly wants later nodes to proceed after failure. |
| `position` | Optional visual-editor coordinates. |
| `index_position` | Optional canvas index used with the label to identify the node in references and edges. |

Do not author custom scripts or implementation code through this skill. For an existing workflow version, preserve the complete saved node objects returned by the API and change only the fields required by the user's requested definition update.

## Inputs and references

Build every `inputs` key from `input_schema`. Ask the user for missing required values; do not fabricate credentials, URLs, table IDs, model selections, recipient identifiers, or other operational data.

A later node can reference an earlier node's output with the workflow context-key syntax:

```text
{{context_key.field}}
{{context_key.items[0].id}}
```

The context key is:

- `label` when `index_position` is `null`;
- `label_index_position` when an index exists.

Examples:

```text
label="start", index_position=null -> start
label="selected_action", index_position=1 -> selected_action_1
```

When the whole input value is one reference, the referenced value can remain an object, array, number, boolean, or string. Embedded references become text.

The public integrations catalog does not provide a formal output schema. Do not guess output field names. Use references already present in a saved workflow, output information explicitly supplied by the user, or output behavior documented through another approved public Puente interface.

Keep labels and indexes unique and stable. If either changes, update every corresponding reference and edge.

## Edges

Edges use workflow context keys, not catalog `node_id` values:

```json
{
  "source": "start",
  "target": "selected_action_1"
}
```

Preserve the complete `edges` array when versioning. When adding a connection, use the exact source and target context keys. When a node label or `index_position` changes, update its edge endpoints.

Do not use edges to invent branching, looping, or execution behavior that is not represented by nodes returned from the integrations API.

## Safe authoring

1. Request `GET /workflows/integrations` and use its returned catalog.
2. Select only a returned `node_id`.
3. Build `inputs` only from that entry's `input_schema`.
4. Ask for every missing required operational value.
5. Default `on_error` to `stop`.
6. Keep new or changed workflows in `draft` unless activation is explicitly requested and confirmed.
7. Show the complete method, path, and JSON payload before sending a create/version request when confirmation is needed.
8. Preserve complete saved nodes and edges when creating a new version.
9. Never call workflow execution, trigger, webhook, schedule, or deletion endpoints.
