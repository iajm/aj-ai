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

    try {
      // Create a conversation if this is a brand-new chat.
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
          return;
        }

        activeConversationId = conversation.id;
        createdNewConversation = true;
      }

      // Show the user's message immediately.
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

      // Persist the exact user message first.
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

        return;
      }

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

      // Ask the server to generate + persist the assistant reply.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          selectedModel,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(
          "AJ API request failed:",
          result
        );

        setError(
          result.error ??
            "AJ could not generate a response."
        );

        return;
      }

      const savedAssistantMessage =
        result.message as ChatMessage;

      // The server only returns this after the assistant
      // response has already been persisted in Supabase.
      setMessages((previous) => [
        ...previous,
        savedAssistantMessage,
      ]);

      // For a new chat, navigate only after both the
      // user and assistant messages are durable.
      if (createdNewConversation) {
        router.replace(
          `/c/${activeConversationId}`
        );
      }
    } catch (requestError) {
      console.error(
        "Unexpected send error:",
        requestError
      );

      setError(
        "Something went wrong while sending your message."
      );
    } finally {
      setSending(false);
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