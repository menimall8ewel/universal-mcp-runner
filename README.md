# universal-mcp-runner

A low-maintenance Cloudflare Worker built from Cloudflare's supported agent stack:

- Think owns the model loop, durable submissions, recovery, and message history.
- Agents SDK owns the remote MCP connection and tool discovery.
- Workers AI runs `@cf/deepseek-ai/deepseek-v4-flash-0731`.
- Workers Builds deploys changes from the `main` branch.

The small HTTP adapter preserves the existing asynchronous task contract:

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

Cloudflare dashboard variables and secrets provide `MCP_URL`,
`MCP_CLIENT_ID`, and `MCP_CLIENT_SECRET`; they are intentionally not stored in
this repository.
