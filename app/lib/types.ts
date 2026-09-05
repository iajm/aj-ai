export type ModelId = "gpt" | "claude";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model: ModelId | null;
  createdAt: number;
};