"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import { ChatMessage, ModelId } from "../lib/types";

type UseChatOptions = {
  conversationId?: string | null;
  projectId?: string | null;
  initialMessages?: ChatMessage[];
};

type StreamEvent =
  | {
      type: "start";
      provider: "openai" | "anthropic";
      model: string;
    }
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "done";
      message: ChatMessage;
    }
  | {
      type: "error";
      error: string;
    };

export function useChat({
  conversationId = null,
  projectId = null,
  initialMessages = [],
}: UseChatOptions = {}) {
  const [messages, setMessages] =
    useState<ChatMessage[]>(initialMessages);

  const [selectedModel, setSelectedModel] =
    useState<ModelId>("gpt");

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const [streamingMessageId, setStreamingMessageId] =
    useState<string | null>(null);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const sendingRef = useRef(false);

  const router = useRouter();
  const supabase = createClient();

  function stopGenerating() {
    abortControllerRef.current?.abort();
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed || sendingRef.current) {
      return;
    }

    sendingRef.current = true;

    setError(null);
    setSending(true);
    setInput("");

    let activeConversationId = conversationId;
    let createdNewConversation = false;
    let temporaryAssistantId: string | null = null;

    try {
      if (!activeConversationId) {
        const {
          data: conversation,
          error: conversationError,
        } = await supabase
          .from("conversations")
          .insert({
            title: trimmed.slice(0, 40),
            project_id: projectId,
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
              ? { ...message, status: "failed" }
              : message
          )
        );

        setError(
          "Your message could not be saved, so ClaudeGPT did not continue."
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

      temporaryAssistantId =
        `stream-${crypto.randomUUID()}`;

      const temporaryAssistant: ChatMessage = {
        id: temporaryAssistantId,
        role: "assistant",
        content: "",
        provider:
          selectedModel === "gpt"
            ? "openai"
            : "anthropic",
        model: null,
        sequence: null,
        createdAt: new Date().toISOString(),
        status: "pending",
      };

      setMessages((previous) => [
        ...previous,
        temporaryAssistant,
      ]);

      setStreamingMessageId(temporaryAssistantId);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: activeConversationId,
          selectedModel,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        let message =
          "ClaudeGPT could not generate a response.";

        try {
          const result = await response.json();

          if (result?.error) {
            message = result.error;
          }
        } catch {}

        throw new Error(message);
      }

      if (!response.body) {
        throw new Error(
          "ClaudeGPT did not return a response stream."
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let finalMessage: ChatMessage | null = null;
      let streamError: string | null = null;

      function handleLine(line: string) {
        if (!line.trim()) return;

        const event = JSON.parse(line) as StreamEvent;

        if (event.type === "start") {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === temporaryAssistantId
                ? {
                    ...message,
                    provider: event.provider,
                    model: event.model,
                  }
                : message
            )
          );

          return;
        }

        if (event.type === "delta") {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === temporaryAssistantId
                ? {
                    ...message,
                    content: message.content + event.text,
                  }
                : message
            )
          );

          return;
        }

        if (event.type === "done") {
          finalMessage = event.message;

          setMessages((previous) =>
            previous.map((message) =>
              message.id === temporaryAssistantId
                ? event.message
                : message
            )
          );

          return;
        }

        if (event.type === "error") {
          streamError = event.error;
        }
      }

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          handleLine(line);
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        handleLine(buffer);
      }

      if (streamError) {
        throw new Error(streamError);
      }

      if (!finalMessage && !abortController.signal.aborted) {
        throw new Error(
          "The response stream ended before ClaudeGPT could save the final message."
        );
      }

      if (createdNewConversation) {
        router.replace(`/c/${activeConversationId}`);
        router.refresh();
      }
    } catch (requestError) {
      const wasAborted =
        requestError instanceof DOMException &&
        requestError.name === "AbortError";

      if (temporaryAssistantId) {
        setMessages((previous) =>
          previous.filter(
            (message) =>
              message.id !== temporaryAssistantId
          )
        );
      }

      if (!wasAborted) {
        console.error(
          "Unexpected send error:",
          requestError
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while sending your message."
        );
      }
    } finally {
      abortControllerRef.current = null;
      setStreamingMessageId(null);
      setIsStreaming(false);
      setSending(false);
      sendingRef.current = false;
    }
  }

  return {
    messages,
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
    stopGenerating,
    error,
    sending,
    isStreaming,
    streamingMessageId,
  };
}
