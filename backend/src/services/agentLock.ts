type AgentTask<T> = () => Promise<T>;

let tail: Promise<void> = Promise.resolve();

export async function withAgentLock<T>(task: AgentTask<T>): Promise<T> {
  let release!: () => void;
  const slot = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = tail;
  tail = slot;
  await previous;
  try {
    return await task();
  } finally {
    release();
  }
}
