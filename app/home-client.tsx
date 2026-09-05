"use client";

import ChatView from "./components/chat-view";
import {
  ConversationSummary,
  ProjectSummary,
} from "./lib/types";

type HomeClientProps = {
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function HomeClient({
  conversations,
  projects,
}: HomeClientProps) {
  return (
    <ChatView
      conversations={conversations}
      projects={projects}
      pageLabel="ClaudeGPT"
      pageTitle="New Chat"
      emptyTitle="How can I help?"
      emptySubtitle="One memory. Two AI brains."
    />
  );
}
