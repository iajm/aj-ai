"use client";

import ChatView from "../../components/chat-view";
import {
  ConversationSummary,
  ProjectSummary,
} from "../../lib/types";

type ProjectClientProps = {
  project: ProjectSummary;
  conversations: ConversationSummary[];
  projectConversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function ProjectClient({
  project,
  conversations,
  projectConversations,
  projects,
}: ProjectClientProps) {
  return (
    <ChatView
      projectId={project.id}
      conversations={conversations}
      projects={projects}
      projectConversations={
        projectConversations
      }
      pageLabel="Project"
      pageTitle={project.name}
      emptyTitle={project.name}
      emptySubtitle="Chats and shared context for this project."
    />
  );
}
