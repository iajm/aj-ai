"use client";

import { useState } from "react";
import { ChatMessage, ModelId } from "../lib/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelId>("gpt");
  const [input, setInput] = useState("");

  function sendMessage(text: string) {
    const trimmed = text.trim();

    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      model: null,
      createdAt: Date.now(),
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: `(mock ${selectedModel} reply) You said: "${trimmed}"`,
      model: selectedModel,
      createdAt: Date.now() + 1,
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
      assistantMessage,
    ]);

    setInput("");
  }

  return {
    messages,
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
  };
}