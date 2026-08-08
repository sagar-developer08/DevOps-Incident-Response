import { Agent, BedrockModel } from "@strands-agents/sdk";
import { config } from "../config.js";
import { SYSTEM_PROMPT } from "./prompts.js";
import { allTools } from "./tools/index.js";

let agentInstance: Agent | null = null;

export function getAgent(): Agent {
  if (!agentInstance) {
    const model = new BedrockModel({
      region: config.awsRegion,
      modelId: config.bedrockModelId,
      temperature: 0.3,
      maxTokens: 4096,
    });

    agentInstance = new Agent({
      model,
      tools: allTools,
      systemPrompt: SYSTEM_PROMPT,
      printer: false,
    });
  }
  return agentInstance;
}

/** Strip internal reasoning tags from model output. */
export function sanitizeAgentResponse(text: string): string {
  return text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<thinking>[\s\S]*/gi, "")
    .replace(/<\/?think(?:ing)?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Extract readable text from Strands agent invoke result. */
export function extractAgentResponse(result: Awaited<ReturnType<Agent["invoke"]>>): string {
  const lastMessage = result.lastMessage;
  if (!lastMessage) return "No response from agent.";

  let raw = "";

  if (typeof lastMessage === "string") {
    raw = lastMessage;
  } else {
    const msg = lastMessage as {
      content?: Array<{ type?: string; text?: string; textBlock?: { text?: string } } | string>;
      text?: string;
    };

    if (msg.text) {
      raw = msg.text;
    } else if (Array.isArray(msg.content)) {
      raw = msg.content
        .map((block) => {
          if (typeof block === "string") return block;
          if (block.text) return block.text;
          if (block.type === "textBlock") {
            const tb = block as { text?: string; textBlock?: { text?: string } };
            return tb.text ?? tb.textBlock?.text ?? "";
          }
          if ("text" in block && typeof (block as { text?: string }).text === "string") {
            return (block as { text: string }).text;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    } else {
      raw = JSON.stringify(lastMessage);
    }
  }

  return sanitizeAgentResponse(raw) || "No response from agent.";
}
