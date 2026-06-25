// Background Agents — non-blocking task delegation
// Fire-and-forget agent tasks, collect results when ready

const MAX_BACKGROUND = 5;
const TASK_TIMEOUT = 120_000;

const tasks = new Map();
let taskCounter = 0;

export function spawnBackground(client, sessionID, agent, prompt) {
  if (tasks.size >= MAX_BACKGROUND) {
    for (const [id, t] of tasks) { if (t.done) tasks.delete(id); }
    if (tasks.size >= MAX_BACKGROUND) return { error: `Max ${MAX_BACKGROUND} background tasks. Wait for completion.` };
  }

  const id = `bg-${++taskCounter}`;
  const task = { id, agent, prompt: prompt.slice(0, 100), startedAt: Date.now(), done: false, result: null, error: null };
  tasks.set(id, task);

  (async () => {
    try {
      const session = await client.session.create({ body: { parentID: sessionID } });
      const childId = session?.data?.id;
      if (!childId) { task.error = 'session creation failed'; task.done = true; return; }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TASK_TIMEOUT);

      try {
        const result = await client.session.prompt({
          path: { id: childId },
          body: { agent, tools: {}, parts: [{ type: 'text', text: prompt }] },
          signal: controller.signal,
        });
        const parts = result?.data?.parts || [];
        task.result = parts.find(p => p.type === 'text')?.text || '[no response]';
      } catch (err) {
        task.error = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
      } finally {
        clearTimeout(timer);
        client.session.delete({ path: { id: childId } }).catch(() => {});
      }
    } catch (err) {
      task.error = err?.message || 'spawn failed';
    }
    task.done = true;
    task.completedAt = Date.now();
  })();

  return { id, agent, status: 'running' };
}

export function backgroundStatus() {
  const result = [];
  for (const [, t] of tasks) {
    result.push({
      id: t.id,
      agent: t.agent,
      prompt: t.prompt,
      done: t.done,
      elapsed: Date.now() - t.startedAt,
      hasResult: !!t.result,
      error: t.error,
    });
  }
  return result;
}

export function collectBackground(id) {
  const task = tasks.get(id);
  if (!task) return { error: `No task ${id}` };
  if (!task.done) return { status: 'still running', elapsed: Date.now() - task.startedAt };
  const result = { ...task };
  tasks.delete(id);
  return result;
}

export function pendingCount() {
  let count = 0;
  for (const [, t] of tasks) if (!t.done) count++;
  return count;
}
