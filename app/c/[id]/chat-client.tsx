"use client";

import ChatView from "../../components/chat-view";
import {
  ChatMessage,
  ConversationSummary,
  ProjectSummary,
} from "../../lib/types";

type ChatClientProps = {
  conversationId: string;
  title: string | null;
  initialMessages: ChatMessage[];
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function ChatClient({
  conversationId,
  title,
  initialMessages,
  conversations,
  projects,
}: ChatClientProps) {
  return (
    <ChatView
      conversationId={conversationId}
      initialMessages={initialMessages}
      conversations={conversations}
      projects={projects}
      pageLabel="ClaudeGPT"
      pageTitle={title ?? "New Chat"}
    />
  );
}
