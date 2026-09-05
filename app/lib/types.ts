export type ModelId = "gpt" | "claude";

export type MessageStatus = "pending" | "sent" | "failed";

export type MessageProvider = "openai" | "anthropic" | null;

export type ChatAttachment = {
  id: string;
  messageId: string;
  conversationId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  storagePath: string;
  url?: string | null;
};

export type PendingAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;

  provider: MessageProvider;
  model: string | null;

  sequence: number | null;
  createdAt: string;
  status: MessageStatus;

  attachments?: ChatAttachment[];
};

export type ConversationSummary = {
  id: string;
  title: string | null;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  createdAt: string;
  updatedAt: string;
};
