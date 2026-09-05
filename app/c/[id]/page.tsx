import { requireUser } from "../../lib/auth";
import { createClient } from "../../lib/supabase/server";
import { getConversations } from "../../lib/conversations";
import { getProjects } from "../../lib/projects";
import {
  ChatAttachment,
  ChatMessage,
} from "../../lib/types";
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

  const {
    data: attachmentRows,
    error: attachmentsError,
  } = await supabase
    .from("message_attachments")
    .select(
      "id, message_id, conversation_id, storage_bucket, storage_path, original_filename, mime_type, size_bytes"
    )
    .eq("conversation_id", id);

  if (attachmentsError) {
    console.error(
      "Could not load attachments:",
      attachmentsError
    );
  }

  const attachmentsByMessage =
    new Map<string, ChatAttachment[]>();

  for (const attachment of attachmentRows ?? []) {
    let signedUrl: string | null = null;

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from(attachment.storage_bucket)
        .createSignedUrl(
          attachment.storage_path,
          60 * 60
        );

    if (!signedError && signedData) {
      signedUrl = signedData.signedUrl;
    }

    const mapped: ChatAttachment = {
      id: attachment.id,
      messageId: attachment.message_id,
      conversationId: attachment.conversation_id,
      storageBucket: attachment.storage_bucket,
      storagePath: attachment.storage_path,
      originalFilename: attachment.original_filename,
      mimeType: attachment.mime_type,
      sizeBytes: Number(attachment.size_bytes),
      url: signedUrl,
    };

    const existing =
      attachmentsByMessage.get(attachment.message_id) ?? [];

    existing.push(mapped);

    attachmentsByMessage.set(
      attachment.message_id,
      existing
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
      attachments:
        attachmentsByMessage.get(message.id) ?? [],
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
