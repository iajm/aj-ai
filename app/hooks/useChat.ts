"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";
import {
  ChatAttachment,
  ChatMessage,
  ModelId,
  PendingAttachment,
} from "../lib/types";

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

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 5;

const ALLOWED_EXTENSIONS = [
  "png", "jpg", "jpeg", "webp", "gif",
  "pdf", "txt", "md", "markdown", "csv", "json",
  "js", "jsx", "ts", "tsx", "html", "css",
  "py", "java", "c", "cpp", "h", "hpp",
  "cs", "go", "rs", "php", "rb", "sh", "sql",
  "xml", "yaml", "yml",
];

function extensionOf(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function safeFilename(filename: string) {
  const extension = extensionOf(filename);

  const base = filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);

  return extension ? `${base}.${extension}` : base;
}

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

  const [pendingAttachments, setPendingAttachments] =
    useState<PendingAttachment[]>([]);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const sendingRef = useRef(false);
  const activeConversationRef =
    useRef<string | null>(conversationId);

  const router = useRouter();
  const supabase = createClient();

  function stopGenerating() {
    abortControllerRef.current?.abort();
  }

  function addAttachments(files: FileList | File[]) {
    setError(null);

    const incoming = Array.from(files);

    const accepted: PendingAttachment[] = [];

    for (const file of incoming) {
      if (
        pendingAttachments.length + accepted.length >=
        MAX_FILES
      ) {
        setError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} is larger than 20 MB.`);
        continue;
      }

      const extension = extensionOf(file.name);

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError(`${file.name} is not supported yet.`);
        continue;
      }

      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
      });
    }

    if (accepted.length) {
      setPendingAttachments((previous) => [
        ...previous,
        ...accepted,
      ]);
    }
  }

  function removeAttachment(id: string) {
    setPendingAttachments((previous) => {
      const target = previous.find(
        (attachment) => attachment.id === id
      );

      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }

      return previous.filter(
        (attachment) => attachment.id !== id
      );
    });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    const filesToSend = [...pendingAttachments];

    if (
      (!trimmed && filesToSend.length === 0) ||
      sendingRef.current
    ) {
      return;
    }

    sendingRef.current = true;
    setError(null);
    setSending(true);
    setInput("");
    setPendingAttachments([]);

    let activeConversationId =
      activeConversationRef.current;

    let createdNewConversation = false;
    let temporaryAssistantId: string | null = null;

    const displayText =
      trimmed ||
      `Attached ${filesToSend.length === 1 ? "file" : "files"}: ${filesToSend
        .map((item) => item.file.name)
        .join(", ")}`;

    try {
      if (!activeConversationId) {
        const {
          data: conversation,
          error: conversationError,
        } = await supabase
          .from("conversations")
          .insert({
            title: trimmed
              ? trimmed.slice(0, 40)
              : filesToSend[0]?.file.name.slice(0, 40) ??
                "Attachment",
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
          setPendingAttachments(filesToSend);
          return;
        }

        activeConversationId = conversation.id;
        activeConversationRef.current = conversation.id;
        createdNewConversation = true;
      }

      const temporaryUserId = crypto.randomUUID();

      const pendingUserMessage: ChatMessage = {
        id: temporaryUserId,
        role: "user",
        content: displayText,
        provider: null,
        model: null,
        sequence: null,
        createdAt: new Date().toISOString(),
        status: "pending",
        attachments: filesToSend.map((item) => ({
          id: item.id,
          messageId: temporaryUserId,
          conversationId: activeConversationId!,
          originalFilename: item.file.name,
          mimeType:
            item.file.type || "application/octet-stream",
          sizeBytes: item.file.size,
          storageBucket: "chat-attachments",
          storagePath: "",
          url: item.previewUrl,
        })),
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
          content: displayText,
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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Could not verify your account.");
      }

      const savedAttachments: ChatAttachment[] = [];

      for (const pending of filesToSend) {
        const filename =
          `${crypto.randomUUID()}-${safeFilename(
            pending.file.name
          )}`;

        const storagePath =
          `${user.id}/${activeConversationId}/${savedUserMessage.id}/${filename}`;

        const { error: uploadError } =
          await supabase.storage
            .from("chat-attachments")
            .upload(storagePath, pending.file, {
              contentType:
                pending.file.type ||
                "application/octet-stream",
              upsert: false,
            });

        if (uploadError) {
          console.error(
            "Attachment upload failed:",
            uploadError
          );

          throw new Error(
            `Could not upload ${pending.file.name}.`
          );
        }

        const {
          data: attachmentRow,
          error: attachmentError,
        } = await supabase
          .from("message_attachments")
          .insert({
            user_id: user.id,
            conversation_id: activeConversationId,
            message_id: savedUserMessage.id,
            storage_bucket: "chat-attachments",
            storage_path: storagePath,
            original_filename: pending.file.name,
            mime_type:
              pending.file.type ||
              "application/octet-stream",
            size_bytes: pending.file.size,
          })
          .select(
            "id, message_id, conversation_id, storage_bucket, storage_path, original_filename, mime_type, size_bytes"
          )
          .single();

        if (attachmentError || !attachmentRow) {
          console.error(
            "Attachment metadata insert failed:",
            attachmentError
          );

          await supabase.storage
            .from("chat-attachments")
            .remove([storagePath]);

          throw new Error(
            `Could not save ${pending.file.name}.`
          );
        }

        savedAttachments.push({
          id: attachmentRow.id,
          messageId: attachmentRow.message_id,
          conversationId: attachmentRow.conversation_id,
          storageBucket: attachmentRow.storage_bucket,
          storagePath: attachmentRow.storage_path,
          originalFilename:
            attachmentRow.original_filename,
          mimeType: attachmentRow.mime_type,
          sizeBytes: attachmentRow.size_bytes,
          url: pending.previewUrl,
        });
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
                attachments: savedAttachments,
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
        attachments: [],
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
                ? {
                    ...event.message,
                    attachments: [],
                  }
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
    pendingAttachments,
    addAttachments,
    removeAttachment,
  };
}
