# Mission Control Configuration

## models.json

Single source of truth for all available models. Edit this file to update model info across the dashboard:

- Model names, providers, and costs
- Speed classifications
- Use cases (when each model is deployed)
- Status (active/inactive)

**Changes take effect immediately after dashboard refresh** (no code redeploy needed).

### Usage

When a model is deployed for a task, reference it by its `id` (e.g., `anthropic/claude-opus-4-6`). The dashboard will automatically pull all metadata from this config.
