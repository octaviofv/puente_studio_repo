# Google Sheets workflow actions

## Contents

- Discover the live contract
- Authorize and manage a connection
- Shared input and metadata meanings
- Batch get values
- Batch get values by data filter
- Create spreadsheet row
- Upsert row

## Discover the live contract

Do not treat this reference as an authoritative action registry. Before saving a Google Sheets node:

1. Call authenticated `GET /workflows/integrations`. This is the saved/selectable node catalog and its editor input schema.
2. Read public `GET /openapi.json`, including `components.schemas.WorkflowNode`, `components.schemas.ScenarioCreate`, and the top-level `x-puente-integration-actions[node_id]` entry.
3. Require the exact same `node_id` in both surfaces. Do not save a node that appears only in one.
4. Build `inputs` from the current action contract. These schemas reject additional properties, so extra fields can fail validation.

The OpenAPI action entry supplies `action_name`, `mutates`, `manual_execution_allowed`, `input_schema`, `output_schema`, and `vue_input_schema`. `mutates` means the action writes Google provider state. `manual_execution_allowed` means the editor may run that node standalone; it does not authorize this management skill to call execution, trigger, webhook, schedule, or other non-public endpoints.

The production schema can be cross-checked at `https://api.puente.xyz/openapi.json`. The authenticated integrations catalog still controls which nodes are currently selectable for the Studio key's environment.

## Authorize and manage a connection

Use `X-API-Key: <STUDIO_KEY>` for every route below. The Studio key supplies company, team, and user identity. Never put it in browser code, a published application, a URL, or a report, and never ask for or infer another `equipo_id`.

1. Before creating any authorization link, discover the team's saved Google
   Sheets connections with:

   ```http
   GET /studio/integrations/connections?provider=google-sheets
   X-API-Key: <STUDIO_KEY>
   ```

   Each public record contains `connection_id`, `provider`, `display_name`,
   `provider_identity`, `status`, `team_id`, `created_at`, and `updated_at`.
   `provider_identity` is the connected Google account email when available.

2. Show the records whose `status` is exactly `active`, using a numbered list
   when there is more than one:

   ```text
   Google Sheets connections ready to use:
   1. Finance Sheets — finance@example.com
   2. Operations Sheets — operations@example.com

   Would you like to use an existing connection or create a new one?
   ```

   If `provider_identity` is `null`, show only `display_name`; never invent an
   email. Retain the opaque `connection_id` behind each displayed choice. Do not
   present `needs_reauth` or `not_accessible` records as ready. If there are no
   active records, say so and offer to create a new connection.

3. If the user chooses an existing connection, inspect it with
   `GET /studio/integrations/connections/{connection_id}?provider=google-sheets`
   and continue only while its public `status` remains `active`.

4. Only if the user chooses a new connection, create a short-lived authorization
   link:

   ```http
   POST /studio/integrations/google-sheets/connect-link
   X-API-Key: <STUDIO_KEY>
   Content-Type: application/json

   {"display_name":"Finance Sheets"}
   ```

   The body is optional; `display_name` is an optional human-facing label of at most 120 characters. The response contains:

   - `connection_id`: opaque Puente identifier for this team-scoped connection;
   - `connect_link`: short-lived URL the user opens in a browser to authorize Google;
   - `expires_at`: time at which that authorization link expires.

5. Show `connect_link` directly in chat without logging it. Ask the user to
   complete Google authorization in their browser and reply when done. Do not
   poll or change a workflow while waiting, and do not treat link creation alone
   as successful authorization.
6. After the user replies, inspect the new connection by its returned
   `connection_id`. Continue only when its public `status` is `active`.
7. For either a reused or newly authorized active connection, verify that it can
   access the intended spreadsheet. `spreadsheet` is the spreadsheet ID or
   supported Google Sheets URL to probe:

   ```http
   POST /studio/integrations/connections/{connection_id}/verify
   X-API-Key: <STUDIO_KEY>
   Content-Type: application/json

   {"spreadsheet":"<spreadsheet ID or Google Sheets URL>"}
   ```

8. Only when the user requests disconnection, call `DELETE /studio/integrations/connections/{connection_id}?provider=google-sheets`. Success is `204 No Content`.

`connection_id` is not a Google token, provider connection ID, or email address. Treat it as an opaque literal scoped to the Studio key's team. It does not support workflow-value interpolation. Never expose underlying provider credentials.

Keep the authorization interaction in chat; do not hand the user terminal commands. A failed spreadsheet probe does not authorize changing the connection or workflow.

## Shared input and metadata meanings

All four actions below currently have `manual_execution_allowed: true`. Always rediscover this metadata before relying on it.

- `connection_id` (required): literal opaque Puente connection ID obtained through the lifecycle above; no workflow interpolation.
- `spreadsheet` (required): spreadsheet ID, supported Google Sheets URL, or a resolved workflow reference.
- `major_dimension` (optional, default `ROWS`): `ROWS` groups returned values by row; `COLUMNS` groups them by column.
- `value_render_option` (optional, default `FORMATTED_VALUE`): `FORMATTED_VALUE` returns display-formatted values, `UNFORMATTED_VALUE` returns underlying values, and `FORMULA` returns formulas.
- `date_time_render_option` (optional, default `SERIAL_NUMBER`): `SERIAL_NUMBER` returns numeric date/time serials; `FORMATTED_STRING` returns formatted text. Google ignores this setting when `value_render_option` is `FORMATTED_VALUE`.

Downstream nodes reference an output through the saved context key described in [nodes.md](nodes.md), for example `{{read_ranges_1.spreadsheet_id}}`.

## Batch get values

`google_sheets.batch_get_values` is read-only (`mutates: false`). It reads several A1 ranges in one request.

Inputs in addition to the shared fields:

- `ranges` (required): non-empty array of A1 range strings. The result `value_ranges` order follows this request order.

Safe node example:

```json
{
  "label": "read_ranges",
  "node_id": "google_sheets.batch_get_values",
  "inputs": {
    "connection_id": "conn_example_opaque",
    "spreadsheet": "https://docs.google.com/spreadsheets/d/example-sheet-id/edit",
    "ranges": ["Orders!A1:D20", "Summary!A1:B5"],
    "major_dimension": "ROWS",
    "value_render_option": "FORMATTED_VALUE",
    "date_time_render_option": "SERIAL_NUMBER"
  },
  "on_error": "stop",
  "position": {"x": 300, "y": 0},
  "index_position": 1
}
```

Output fields:

- `spreadsheet_id`: resolved Google spreadsheet ID.
- `value_ranges`: array in requested range order. Each item contains `range` (resolved range), `major_dimension` (`ROWS` or `COLUMNS`), and `values` (two-dimensional value array grouped by that dimension).

## Batch get values by data filter

`google_sheets.batch_get_values_by_data_filter` is read-only (`mutates: false`). It reads ranges selected by Google data filters.

Inputs in addition to the shared fields:

- `data_filters` (required): non-empty array. Each item must select exactly one of `a1_range`, `grid_range`, or `developer_metadata_lookup`.
- `a1_range`: non-empty A1 range such as `Sheet1!A1:D20`.
- `grid_range`: object whose optional non-negative integer fields are `sheet_id`, `start_row_index`, `end_row_index`, `start_column_index`, and `end_column_index`. `sheet_id` is the numeric tab ID/gid, not the spreadsheet ID. Row and column indexes are zero-based and half-open: start is inclusive, end is exclusive; an omitted boundary is unbounded on that side.
- `developer_metadata_lookup`: advanced lookup object. Its published optional fields are:
  - `location_type`: `SPREADSHEET`, `SHEET`, `ROW`, or `COLUMN`;
  - `metadata_location`: free-form object in the published schema; do not invent nested fields;
  - `location_matching_strategy`: `EXACT_LOCATION` or `INTERSECTING_LOCATION`;
  - `metadata_id`: integer greater than or equal to zero;
  - `metadata_key`: non-empty string;
  - `metadata_value`: string;
  - `visibility`: `DOCUMENT` or `PROJECT`.

Valid selector shapes include:

```json
{"a1_range":"Sheet1!A1:D20"}
```

```json
{"grid_range":{"sheet_id":0,"start_row_index":0,"end_row_index":20,"start_column_index":0,"end_column_index":4}}
```

```json
{"developer_metadata_lookup":{"metadata_key":"region","metadata_value":"south","visibility":"DOCUMENT"}}
```

Safe node example:

```json
{
  "label": "read_filtered",
  "node_id": "google_sheets.batch_get_values_by_data_filter",
  "inputs": {
    "connection_id": "conn_example_opaque",
    "spreadsheet": "example-sheet-id",
    "data_filters": [
      {"a1_range": "Sheet1!A1:D20"},
      {"grid_range": {"sheet_id": 0, "start_row_index": 20, "end_row_index": 40}}
    ],
    "major_dimension": "ROWS",
    "value_render_option": "UNFORMATTED_VALUE",
    "date_time_render_option": "SERIAL_NUMBER"
  },
  "on_error": "stop",
  "index_position": 2
}
```

Output fields:

- `spreadsheet_id`: resolved Google spreadsheet ID.
- `value_ranges`: matched results. Each item contains `data_filters` (the filters that matched it) and `value_range`, whose `range`, `major_dimension`, and `values` describe the matched values. Use `data_filters` to trace why a range was returned; do not assume one result per request filter or request-order correspondence.

## Create spreadsheet row

`google_sheets.create_spreadsheet_row` writes Google Sheets state (`mutates: true`). It inserts one row, shifts existing rows downward, then writes from column A using `USER_ENTERED`, so Google parses the strings as if the user typed them in the Sheets UI.

Inputs in addition to `connection_id` and `spreadsheet`:

- `sheet_id` (required): non-negative integer tab ID/gid. Zero is valid.
- `sheet_name` (required): visible title of that same tab.
- `row_index` (required): zero-based insertion position. `0` inserts before visible row 1; `2` inserts before visible row 3.
- `values` (required): non-empty string array mapped from column A onward.

Safety invariant: `sheet_id` and `sheet_name` must identify the same tab. Otherwise the insertion and value write can target different tabs. Verify both before saving or manually running the node.

Safe node example:

```json
{
  "label": "insert_order",
  "node_id": "google_sheets.create_spreadsheet_row",
  "inputs": {
    "connection_id": "conn_example_opaque",
    "spreadsheet": "example-sheet-id",
    "sheet_id": 0,
    "sheet_name": "Orders",
    "row_index": 2,
    "values": ["order-123", "2026-08-20", "42.50"]
  },
  "on_error": "stop",
  "index_position": 3
}
```

Output fields:

- `spreadsheet_id`: resolved Google spreadsheet ID.
- `sheet_id`: numeric tab ID used for insertion.
- `row_index`: zero-based insertion position.
- `values`: strings written from column A onward.
- `updated_range`: A1 range Google reports as updated.

## Upsert row

`google_sheets.upsert_row` writes Google Sheets state (`mutates: true`).

Inputs in addition to `connection_id` and `spreadsheet`:

- `range` (required): A1 table/search range. Include the sheet name. Until the row-index calculation is corrected, use a range beginning at row 1, such as `Customers!A1:D`.
- `values` (required): non-empty string array for the target row.
- `key_column` (optional only together with `key_value`): zero-based column index within each row returned by `range`.
- `key_value` (optional only together with `key_column`): non-empty string matched by exact equality.

With the key pair, the action updates the first exact match using `USER_ENTERED`; if no row matches, it appends. With both fields omitted, it always appends. Append behavior uses `INSERT_ROWS`.

Current implementation caveat: returned `row_index` is the zero-based match index within the fetched range, not an absolute sheet row. The update calculation does not account for an A1 range that starts below row 1. Recommend a search range beginning at row 1 and do not describe `row_index` as an absolute row number.

Safe node example:

```json
{
  "label": "upsert_customer",
  "node_id": "google_sheets.upsert_row",
  "inputs": {
    "connection_id": "conn_example_opaque",
    "spreadsheet": "{{start.spreadsheet_url}}",
    "range": "Customers!A1:D",
    "values": ["customer-123", "Ana", "active", "2026-08-20"],
    "key_column": 0,
    "key_value": "customer-123"
  },
  "on_error": "stop",
  "index_position": 4
}
```

Output fields:

- `spreadsheet_id`: resolved Google spreadsheet ID.
- `updated_range`: A1 range affected; defaults to an empty string when Google reports none.
- `updated_rows`, `updated_columns`, `updated_cells`: non-negative write counts, each defaulting to zero.
- `success`: always `true` for a successful action response.
- `operation`: `updated` when the first exact match was updated, or `appended` when a row was appended.
- `row_index`: zero-based match index within the fetched range for an update; `null` on append.
