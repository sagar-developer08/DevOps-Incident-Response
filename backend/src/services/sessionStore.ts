export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  createdAt: string;
  lastMessageAt?: string;
  messageCount: number;
  messages: ChatMessage[];
}

const sessions = new Map<string, Session>();

export function createSession(id: string): Session {
  const session: Session = {
    id,
    createdAt: new Date().toISOString(),
    messageCount: 0,
    messages: [],
  };
  sessions.set(id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function getOrCreateSession(id: string): Session {
  const existing = sessions.get(id);
  if (existing) return existing;
  return createSession(id);
}

export function addMessage(sessionId: string, role: "user" | "assistant", content: string): void {
  const session = getOrCreateSession(sessionId);
  session.messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });
  session.messageCount += 1;
  session.lastMessageAt = new Date().toISOString();
}

/** Build prompt with conversation history for multi-turn context. */
export function buildPromptWithHistory(session: Session, userMessage: string): string {
  if (session.messages.length === 0) return userMessage;

  const history = session.messages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  return (
    `[Previous conversation for context]\n${history}\n\n` +
    `[Current message]\nUser: ${userMessage}`
  );
}
