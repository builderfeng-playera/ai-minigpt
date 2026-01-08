export interface ModelInfo {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: "grok-4-fast",
    name: "Grok 4 Fast",
    description: "Fast Grok model for quick responses",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "Fast and cost-effective",
  },
  {
    id: "supermind-agent-v1",
    name: "Supermind Agent",
    description: "Multi-tool agent with web search",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google's powerful Gemini model",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    description: "Fast Gemini reasoning model",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    description: "OpenAI-compatible model",
  },
];

export const DEFAULT_MODEL = "grok-4-fast";

export function getModelInfo(modelId: string): ModelInfo {
  return AVAILABLE_MODELS.find((m) => m.id === modelId) || AVAILABLE_MODELS[0];
}

