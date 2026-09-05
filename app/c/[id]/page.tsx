import { requireUser } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";
import { getConversations } from "../../lib/conversations";
import { getProjects } from "../../lib/projects";
import { ChatMessage } from "../../lib/types";
import ChatClient from "./chat-client";

type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  await requireUser();

  const { id } = await params;
  const supabase = await createClient();

  const {
    data: conversation,
    error: conversationError,
  } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", id)
    .single();

  if (conversationError || !conversation) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
        <p className="text-red-400">
          Conversation not found.
        </p>
      </main>
    );
  }

  const { data: rows, error: messagesError } =
    await supabase
      .from("messages")
      .select(
        "id, role, content, provider, model, sequence, created_at"
      )
      .eq("conversation_id", id)
      .order("sequence", {
        ascending: true,
      });

  if (messagesError) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
        <p className="text-red-400">
          Could not load messages.
        </p>
      </main>
    );
  }

  const initialMessages: ChatMessage[] =
    (rows ?? []).map((message) => ({
      id: message.id,
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",
      content: message.content,
      provider:
        message.provider === "openai" ||
        message.provider === "anthropic"
          ? message.provider
          : null,
      model: message.model,
      sequence: message.sequence,
      createdAt: message.created_at,
      status: "sent",
    }));

  const [conversations, projects] =
    await Promise.all([
      getConversations(),
      getProjects(),
    ]);

  return (
    <ChatClient
      conversationId={conversation.id}
      title={conversation.title}
      initialMessages={initialMessages}
      conversations={conversations}
      projects={projects}
    />
  );
}