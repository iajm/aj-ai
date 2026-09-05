"use client";

import ChatSidebar from "./components/chat-sidebar";
import { useChat } from "./hooks/useChat";
import {
  ConversationSummary,
  ProjectSummary,
} from "./lib/types";

type HomeClientProps = {
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function HomeClient({
  conversations,
  projects,
}: HomeClientProps) {
  const {
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
    error,
    sending,
  } = useChat();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <ChatSidebar
        conversations={conversations}
        projects={projects}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[70px] items-center justify-between border-b border-zinc-800 px-6">
          <div>
            <div className="text-xs text-zinc-500">
              ClaudeGPT
            </div>

            <div className="font-medium">
              New Chat
            </div>
          </div>

          <div className="flex rounded-lg bg-zinc-900 p-1">
            <button
              type="button"
              onClick={() =>
                setSelectedModel("gpt")
              }
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

        <section className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">
              How can I help?
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              One memory. Two AI brains.
            </p>
          </div>
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
              disabled={sending}
              placeholder={`Message AJ using ${
                selectedModel === "gpt"
                  ? "GPT"
                  : "Claude"
              }...`}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none disabled:opacity-50"
            />

            <button
              type="button"
              disabled={sending}
              onClick={() =>
                sendMessage(input)
              }
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
      </main>
    </div>
  );
}
