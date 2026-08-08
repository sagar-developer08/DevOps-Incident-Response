import { getAgent, extractAgentResponse } from "../agent/agent.js";
import { withAgentLock } from "./agentLock.js";
import {
  addMessage,
  buildPromptWithHistory,
  getOrCreateSession,
} from "./sessionStore.js";
import {
  formatInvestigationForAgent,
  investigateService,
  type InvestigationSnapshot,
} from "./diagnostics/investigate.js";
import type { ServiceName } from "./mockServices/types.js";

export interface InvokeResult {
  response: string;
  sessionId: string;
  success: boolean;
  hint?: string;
  investigation?: InvestigationSnapshot;
}

export async function invokeIncidentAgent(
  userMessage: string,
  sessionId: string,
  options?: { serviceName?: ServiceName; investigation?: InvestigationSnapshot }
): Promise<InvokeResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      response: "Please provide an incident description.",
      sessionId,
      success: false,
      hint: "Include service name, environment, symptoms, and timeframe.",
    };
  }

  const session = getOrCreateSession(sessionId);
  let investigation = options?.investigation;

  if (!investigation && options?.serviceName) {
    investigation = await investigateService(options.serviceName);
  }

  let prompt = buildPromptWithHistory(session, trimmed);
  if (investigation) {
    prompt =
      `${formatInvestigationForAgent(investigation)}\n\n` +
      `[User already reviewed the above tool outputs in the UI. Analyze this evidence, cite it, and recommend remediation.]\n\n` +
      prompt;
  }

  addMessage(sessionId, "user", trimmed);

  try {
    const result = await withAgentLock(async () => {
      const agent = getAgent();
      return agent.invoke(prompt);
    });
    const responseText = extractAgentResponse(result);
    addMessage(sessionId, "assistant", responseText);

    const updatedInvestigation =
      options?.serviceName ? await investigateService(options.serviceName) : investigation;

    return {
      response: responseText,
      sessionId,
      success: true,
      investigation: updatedInvestigation,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Agent invoke error:", message);

    let hint = "Check AWS credentials and Bedrock model access.";
    if (message.includes("AccessDenied")) {
      hint = "Enable Bedrock model access in AWS Console (us-east-1).";
    } else if (message.includes("already processing")) {
      hint = "Wait for the current agent response to finish.";
    }

    const errorResponse = `Agent processing failed: ${message}`;
    addMessage(sessionId, "assistant", errorResponse);

    return { response: errorResponse, sessionId, success: false, hint };
  }
}

export async function invokeAgentDirect(prompt: string): Promise<string> {
  const result = await withAgentLock(async () => {
    const agent = getAgent();
    return agent.invoke(prompt);
  });
  return extractAgentResponse(result);
}
