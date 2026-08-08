import MarkdownContent from "./MarkdownContent";
import { sanitizeAgentContent } from "../utils/sanitizeAgentContent";

export default function ChatMessage({ message }) {
  const { role, content, isError } = message;
  const isAgent = role === "assistant";
  const displayContent = isAgent ? sanitizeAgentContent(content) : content;

  return (
    <div className={`message ${role} ${isError ? "error" : ""}`}>
      <div className={`message-avatar ${role}`}>{role === "user" ? "👤" : "🛡️"}</div>
      <div className="message-body">
        <div className="message-header">
          <span className="message-role">{role === "user" ? "You" : "Incident Agent"}</span>
        </div>
        <div className="message-content">
          {isAgent && !isError ? (
            displayContent ? (
              <MarkdownContent content={displayContent} />
            ) : (
              <p className="message-plain">No response from agent.</p>
            )
          ) : (
            <p className="message-plain">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
