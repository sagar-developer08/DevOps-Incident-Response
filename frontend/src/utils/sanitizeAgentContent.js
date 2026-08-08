/** Remove model reasoning blocks and normalize agent text for display. */
export function sanitizeAgentContent(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thinking>[\s\S]*/gi, "")
    .replace(/<\/?think(?:ing)?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
