# TaskPilot Runner

Node.js job runner that processes tasks from the TaskPilot API.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your GlitchTip DSN and API URL
npm start
```

## Endpoints

- `GET /health` — service health
- `POST /tasks/run` — trigger a job manually
- `GET /tasks/status/:id` — check job status

## Testing

```bash
# Trigger a job manually
curl -X POST http://localhost:3001/tasks/run \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "title": "Test job", "priority": "high", "options": {"maxRetries": 2, "timeout": 5000}}'

# Trigger the bug (no options field)
curl -X POST http://localhost:3001/tasks/run \
  -H "Content-Type: application/json" \
  -d '{"id": 2, "title": "Scheduled sync", "priority": "medium"}'
```
