"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { ChatMessage, ModelId } from "../lib/types";

type UseChatOptions = {
  conversationId?: string | null;
  initialMessages?: ChatMessage[];
};

export function useChat({
  conversationId = null,
  initialMessages = [],
}: UseChatOptions = {}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages);

  const [selectedModel, setSelectedModel] =
    useState<ModelId>("gpt");

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    let activeConversationId = conversationId;
    let createdNewConversation = false;

    // Create a conversation only if this is the blank homepage.
    if (!activeConversationId) {
      const {
        data: conversation,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .insert({
          title: trimmed.slice(0, 40),
        })
        .select("id")
        .single();

      if (conversationError || !conversation) {
        console.error(
          "Conversation insert failed:",
          conversationError
        );

        setError("Could not create conversation.");
        setSending(false);
        return;
      }

      activeConversationId = conversation.id;
      createdNewConversation = true;
    }

    // Temporary user bubble.
    const temporaryUserId = crypto.randomUUID();

    const pendingUserMessage: ChatMessage = {
      id: temporaryUserId,
      role: "user",
      content: trimmed,
      provider: null,
      model: null,
      sequence: null,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setMessages((previous) => [
      ...previous,
      pendingUserMessage,
    ]);

    // Persist exact user message.
    const {
      data: savedUserMessage,
      error: userMessageError,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "user",
        content: trimmed,
        provider: null,
        model: null,
      })
      .select(
        "id, role, content, provider, model, sequence, created_at"
      )
      .single();

    if (userMessageError || !savedUserMessage) {
      console.error(
        "User message insert failed:",
        userMessageError
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === temporaryUserId
            ? {
                ...message,
                status: "failed",
              }
            : message
        )
      );

      setError(
        "Your message could not be saved, so AJ did not continue."
      );

      setSending(false);
      return;
    }

    // Replace temp identity with DB identity.
    setMessages((previous) =>
      previous.map((message) =>
        message.id === temporaryUserId
          ? {
              ...message,
              id: savedUserMessage.id,
              sequence: savedUserMessage.sequence,
              createdAt: savedUserMessage.created_at,
              status: "sent",
            }
          : message
      )
    );

    // Mock assistant response.
    const provider =
      selectedModel === "gpt"
        ? ("openai" as const)
        : ("anthropic" as const);

    const model =
      selectedModel === "gpt"
        ? "gpt-mock"
        : "claude-mock";

    const replyText =
      `(mock ${selectedModel} reply) You said: "${trimmed}"`;

    const temporaryAssistantId = crypto.randomUUID();

    const pendingAssistantMessage: ChatMessage = {
      id: temporaryAssistantId,
      role: "assistant",
      content: replyText,
      provider,
      model,
      sequence: null,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setMessages((previous) => [
      ...previous,
      pendingAssistantMessage,
    ]);

    // Persist assistant response.
    const {
      data: savedAssistantMessage,
      error: assistantMessageError,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        role: "assistant",
        content: replyText,
        provider,
        model,
      })
      .select(
        "id, role, content, provider, model, sequence, created_at"
      )
      .single();

    if (
      assistantMessageError ||
      !savedAssistantMessage
    ) {
      console.error(
        "Assistant message insert failed:",
        assistantMessageError
      );

      setMessages((previous) =>
        previous.map((message) =>
          message.id === temporaryAssistantId
            ? {
                ...message,
                status: "failed",
              }
            : message
        )
      );

      setError("AJ's response could not be saved.");
      setSending(false);
      return;
    }

    setMessages((previous) =>
      previous.map((message) =>
        message.id === temporaryAssistantId
          ? {
              ...message,
              id: savedAssistantMessage.id,
              sequence: savedAssistantMessage.sequence,
              createdAt: savedAssistantMessage.created_at,
              status: "sent",
            }
          : message
      )
    );

    setSending(false);

    // Convert a blank New Chat into its durable URL
    // only after both messages are safely stored.
    if (createdNewConversation) {
      router.replace(
        `/c/${activeConversationId}`
      );
    }
  }

  return {
    messages,
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
    error,
    sending,
  };
}