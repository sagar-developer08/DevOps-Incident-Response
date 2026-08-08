import { useState } from "react";

export default function IncidentForm({ onSend, loading, error }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="incident-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      <div className="input-row">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the incident... (e.g. 'Checkout API 503 in prod since 10:30 AM')"
          rows={2}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
          {loading ? "Analyzing..." : "Send"}
        </button>
      </div>
    </form>
  );
}
