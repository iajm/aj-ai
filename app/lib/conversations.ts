import { createClient } from "./supabase/server";
import { ConversationSummary } from "./types";

export async function getConversations(): Promise<
  ConversationSummary[]
> {
  const supabase = await createClient();

  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(
      "id, title, project_id, created_at, updated_at"
    )
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Could not load conversations:",
      error
    );

    return [];
  }

  return (conversations ?? []).map(
    (conversation) => ({
      id: conversation.id,
      title: conversation.title,
      projectId: conversation.project_id,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    })
  );
}