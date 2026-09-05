"use client";

import { ChatMessage } from "../../lib/types";
import { useChat } from "../../hooks/useChat";

type ChatClientProps = {
  conversationId: string;
  title: string | null;
  initialMessages: ChatMessage[];
};

export default function ChatClient({
  conversationId,
  title,
  initialMessages,
}: ChatClientProps) {
  const {
    messages,
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
    error,
    sending,
  } = useChat({
    conversationId,
    initialMessages,
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <div className="text-xs text-zinc-500">
              AJ AI
            </div>

            <h1 className="font-medium">
              {title ?? "New Chat"}
            </h1>
          </div>

          <div className="flex rounded-lg bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() => setSelectedModel("gpt")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                selectedModel === "gpt"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400"
              }`}
            >
              GPT
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedModel("claude")
              }
              className={`rounded-md px-3 py-1.5 text-sm ${
                selectedModel === "claude"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400"
              }`}
            >
              Claude
            </button>
          </div>
        </header>

        <section className="flex-1 space-y-5 overflow-y-auto px-6 py-8">
          {messages.map((message) => {
            const label =
              message.role === "user"
                ? "YOU"
                : message.provider === "openai"
                  ? "GPT"
                  : message.provider === "anthropic"
                    ? "CLAUDE"
                    : "ASSISTANT";

            return (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-2xl"
                    : "mr-auto max-w-2xl"
                }
              >
                <div className="mb-1 text-xs text-zinc-500">
                  {label}
                </div>

                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-zinc-800"
                      : "bg-zinc-900"
                  } ${
                    message.status === "pending"
                      ? "opacity-60"
                      : ""
                  } ${
                    message.status === "failed"
                      ? "border border-red-800"
                      : ""
                  }`}
                >
                  {message.content}
                </div>

                {message.status === "failed" && (
                  <div className="mt-1 text-xs text-red-400">
                    Failed to save
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <footer className="border-t border-zinc-800 p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={`Message AJ using ${
                selectedModel === "gpt"
                  ? "GPT"
                  : "Claude"
              }...`}
              disabled={sending}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none disabled:opacity-50"
            />

            <button
              type="button"
              disabled={sending}
              onClick={() => sendMessage(input)}
              className="rounded-xl bg-zinc-100 px-5 py-3 font-medium text-zinc-900 disabled:opacity-50"
            >
              {sending ? "..." : "Send"}
            </button>
          </div>

          {error && (
            <p className="mx-auto mt-2 max-w-3xl text-sm text-red-400">
              {error}
            </p>
          )}
        </footer>
      </div>
    </main>
  );
}