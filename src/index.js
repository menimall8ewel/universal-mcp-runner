import { Think } from "@cloudflare/think";
import { getAgentByName } from "agents";

const SYSTEM_PROMPT = `You are a durable universal task runner.
Use the connected MCP tools whenever a task requires external information or an external action.
Never claim that an external action succeeded unless the tool result confirms it.
Return a concise, self-contained final answer.`;
const TASK_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const MAX_TASK_LENGTH = 32000;

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function messageText(message) {
  if (!message || message.role !== "assistant" || !Array.isArray(message.parts)) return null;
  const text = message.parts
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
  return text || null;
}

function taskRoute(pathname) {
  const match = pathname.match(/^\/tasks\/([^/]+)(?:\/(result|cancel))?$/);
  if (!match) return null;
  try {
    const taskId = decodeURIComponent(match[1]);
    return TASK_ID.test(taskId)
      ? { taskId, action: match[2] ?? "status" }
      : null;
  } catch {
    return null;
  }
}

export class UniversalMcpAgent extends Think {
  waitForMcpConnections = true;

  getModel() {
    return this.env.AGENT_MODEL;
  }

  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  async onStart() {
    await this.addMcpServer("portal", this.env.MCP_URL, {
      id: "portal",
      transport: {
        type: "streamable-http",
        headers: {
          "CF-Access-Client-Id": this.env.MCP_CLIENT_ID,
          "CF-Access-Client-Secret": this.env.MCP_CLIENT_SECRET,
        },
      },
    });
  }

  async taskSnapshot(taskId) {
    const submission = await this.inspectSubmission(taskId);
    if (!submission) return null;
    const latest =
      submission.status === "completed" ? await this.session.getLatestLeaf() : null;
    return {
      task_id: taskId,
      status: submission.status,
      output: messageText(latest),
      error: submission.error ?? null,
      created_at: submission.createdAt,
      started_at: submission.startedAt ?? null,
      completed_at: submission.completedAt ?? null,
    };
  }
}

async function createTask(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const task = typeof body.task === "string" ? body.task.trim() : "";
  if (!task) return json({ error: "A non-empty 'task' string is required." }, 400);
  if (task.length > MAX_TASK_LENGTH) {
    return json({ error: `'task' must be at most ${MAX_TASK_LENGTH} characters.` }, 400);
  }

  for (const key of ["task_id", "idempotency_key"]) {
    if (body[key] != null && (typeof body[key] !== "string" || !TASK_ID.test(body[key].trim()))) {
      return json({ error: `'${key}' must be 1-128 characters using letters, numbers, '.', '_', ':', or '-'.` }, 400);
    }
  }

  const requestedId = body.task_id?.trim() || null;
  const idempotencyId = body.idempotency_key?.trim() || null;
  if (requestedId && idempotencyId && requestedId !== idempotencyId) {
    return json({ error: "'task_id' and 'idempotency_key' must match when both are provided." }, 400);
  }

  const taskId = requestedId || idempotencyId || crypto.randomUUID();
  const agent = await getAgentByName(env.UniversalMcpAgent, taskId);
  const submission = await agent.submitMessages(
    [
      {
        id: crypto.randomUUID(),
        role: "user",
        parts: [{ type: "text", text: task }],
      },
    ],
    {
      submissionId: taskId,
      idempotencyKey: taskId,
      metadata: { source: "tasks-api" },
    },
  );

  return json(
    { task_id: taskId, status: submission.status, accepted: submission.accepted },
    submission.accepted ? 202 : 200,
  );
}

async function handleTaskRoute(request, env, route) {
  const agent = await getAgentByName(env.UniversalMcpAgent, route.taskId);

  if (route.action === "cancel") {
    if (request.method !== "POST" && request.method !== "DELETE") {
      return json({ error: "Method not allowed." }, 405);
    }
    const current = await agent.inspectSubmission(route.taskId);
    if (!current) return json({ error: "Task not found." }, 404);
    if (current.status !== "pending" && current.status !== "running") {
      return json({ task_id: route.taskId, status: current.status });
    }
    await agent.cancelSubmission(route.taskId, "Cancelled through the tasks API.");
    const cancelled = await agent.inspectSubmission(route.taskId);
    return json({ task_id: route.taskId, status: cancelled?.status ?? "aborted" });
  }

  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  const snapshot = await agent.taskSnapshot(route.taskId);
  if (!snapshot) return json({ error: "Task not found." }, 404);

  if (route.action === "result") {
    return json({
      task_id: snapshot.task_id,
      status: snapshot.status,
      output: snapshot.output,
      error: snapshot.error,
    });
  }
  return json(snapshot);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/tasks" && request.method === "POST") {
      return createTask(request, env);
    }
    const route = taskRoute(url.pathname);
    if (route) return handleTaskRoute(request, env, route);
    if (url.pathname === "/" && request.method === "GET") {
      return json({
        service: "universal-mcp-runner",
        runtime: "Cloudflare Think",
        endpoints: ["POST /tasks", "GET /tasks/:id", "GET /tasks/:id/result", "POST /tasks/:id/cancel"],
      });
    }
    return json({ error: "Not found." }, 404);
  },
};
