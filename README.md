# Puente Studio

Workspace de ejemplo para crear aplicaciones web en **Puente OS**.

Las habilidades y herramientas para administrar aplicaciones, artefactos y workflows ya no se mantienen en este repositorio. Instálalas desde el marketplace oficial [`puente-os/agent-skills`](https://github.com/puente-os/agent-skills).

## Instalar en Claude Code

Ejecuta estos comandos dentro de Claude Code:

```text
/plugin marketplace add puente-os/agent-skills
/plugin install puente-os@skills
```

Reinicia Claude Code después de la instalación.

## Instalar en Codex

```bash
codex plugin marketplace add puente-os/agent-skills
codex plugin add puente-os@skills
```

Inicia una nueva tarea de Codex después de la instalación.

## Habilidades disponibles

- `puente-studio`: crea y administra aplicaciones, artefactos, tablas e integraciones de Puente Studio.
- `manage-puente-workflows`: administra definiciones, nodos, versiones e integraciones de workflows.

Los scripts `pull_artefacto.js` y `files_to_json.js` vienen incluidos en `puente-studio` y trabajan con `app/files`, `app/output.json` y el archivo `.env` del proyecto actual.

## Configuración del proyecto

```bash
cp .env.example .env
```

Completa las variables requeridas sin guardar credenciales en Git:

```env
BASE_URL=<base_url>
STUDIO_KEY=<puente_studio_placeholder>
```

Consulta el [marketplace oficial](https://github.com/puente-os/agent-skills) para instrucciones de actualización y la documentación vigente.
