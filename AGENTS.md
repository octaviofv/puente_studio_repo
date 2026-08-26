# Puente Studio repository instructions

## Repository purpose

This repository is an example workspace for Puente Studio applications. The official agent skills and their helper scripts are maintained in the [`puente-os/agent-skills`](https://github.com/puente-os/agent-skills) marketplace, not in this repository.

## Required skills

- Use `puente-studio` for work involving Puente applications, artifacts, tables, integrations, local development, validation, or publication.
- Use `manage-puente-workflows` for work involving workflow definitions, nodes, edges, versions, activation, schedules, or webhooks.
- Read the selected skill completely before acting. When a task involves both areas, load both skills.
- If the skills are unavailable, install `puente-os@skills` from the official marketplace by following the repository README. Do not recreate `.agents/skills/` or `.claude/skills/` copies here.

## Runtime files

- The installed `puente-studio` skill provides `pull_artefacto.js` and `files_to_json.js`.
- Those scripts operate on this workspace's `app/files`, `app/output.json`, and ignored `.env` file.
- `app/image_upload_template/` contains example application source and is intentionally local to this repository.

## Credentials and safety

- Never read credentials aloud, print them in logs, or include them in commits, reports, prompts, or generated application code.
- Never use `STUDIO_KEY` inside published application source code.
