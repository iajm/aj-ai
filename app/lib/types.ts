export type ModelId = "gpt" | "claude";

export type MessageStatus = "pending" | "sent" | "failed";

export type MessageProvider = "openai" | "anthropic" | null;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;

  provider: MessageProvider;
  model: string | null;

  sequence: number | null;
  createdAt: string;
  status: MessageStatus;
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};