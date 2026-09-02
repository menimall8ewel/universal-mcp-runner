import { Think } from "@cloudflare/think";
import { getAgentByName, routeAgentRequest } from "agents";

const MODEL = "@cf/deepseek-ai/deepseek-v4-flash-0731";

const SYSTEM_PROMPT = `You are a durable universal task runner.
Use the connected MCP tools whenever a task requires external information or an external action.
Never claim that an external action succeeded unless the tool result confirms it.
Return a concise, self-contained final answer.`;

function json(value, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function messageText(message) {
  if (!message || message.role !== "assistant") return null;

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
    return { taskId: decodeURIComponent(match[1]), action: match[2] ?? "status" };
  } catch {
    return null;
  }
}

export class UniversalMcpAgent extends Think {
  waitForMcpConnections = true;

  getModel() {
    return MODEL;
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

  const taskId =
    typeof body.task_id === "string" && body.task_id.trim()
      ? body.task_id.trim()
      : crypto.randomUUID();

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
      idempotencyKey:
        typeof body.idempotency_key === "string" && body.idempotency_key.trim()
          ? body.idempotency_key.trim()
          : taskId,
      metadata: { source: "tasks-api" },
    },
  );

  return json(
    {
      task_id: taskId,
      status: submission.status,
      accepted: submission.accepted,
    },
    submission.accepted ? 202 : 200,
  );
}

async function handleTaskRoute(request, env, route) {
  const agent = await getAgentByName(env.UniversalMcpAgent, route.taskId);

  if (route.action === "cancel") {
    if (request.method !== "POST" && request.method !== "DELETE") {
      return json({ error: "Method not allowed." }, 405);
    }
    await agent.cancelSubmission(route.taskId, "Cancelled through the tasks API.");
    return json({ task_id: route.taskId, status: "aborted" });
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
        endpoints: ["POST /tasks", "GET /tasks/:id", "GET /tasks/:id/result"],
      });
    }

    return (await routeAgentRequest(request, env)) ?? json({ error: "Not found." }, 404);
  },
};
