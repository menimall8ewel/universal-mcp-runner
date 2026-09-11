# universal-mcp-runner

A low-maintenance Cloudflare Worker built from Cloudflare's supported agent stack:

- Think owns the model loop, durable submissions, recovery, and message history.
- Agents SDK owns the remote MCP connection and tool discovery.
- Workers AI runs the configured `AGENT_MODEL`.
- Workers Builds deploys changes from the `main` branch.
- MCP Portal uses Cloudflare's `minimize_tools` context optimization.

The small HTTP adapter preserves the asynchronous task contract:

```text
POST /tasks
GET  /tasks/:id
GET  /tasks/:id/result
POST /tasks/:id/cancel
```

Create a task with JSON such as:

```json
{
  "task": "Use the available tools to calculate 59 × 59."
}
```

For retry-safe submission, send either `task_id` or `idempotency_key`. If both are sent, they must match. IDs are limited to 128 characters and task text to 32,000 characters.

Non-secret runtime configuration such as `AGENT_MODEL` and the optimized `MCP_URL` is kept in `wrangler.jsonc`. Cloudflare dashboard configuration provides `MCP_CLIENT_ID` and `MCP_CLIENT_SECRET`; the secret is not stored in this repository.

## OpenHands governance

The canonical skill marketplace uses `main` with repository path `.agents`. See [automatic loading and verification](docs/openhands-autoload.md) for version 1.2.5 and runtime acceptance status.
