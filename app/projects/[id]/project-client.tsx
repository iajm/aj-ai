"use client";

import Link from "next/link";
import ChatSidebar from "../../components/chat-sidebar";
import { useChat } from "../../hooks/useChat";
import {
  ConversationSummary,
  ProjectSummary,
} from "../../lib/types";

type ProjectClientProps = {
  project: ProjectSummary;
  conversations: ConversationSummary[];
  projectConversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function ProjectClient({
  project,
  conversations,
  projectConversations,
  projects,
}: ProjectClientProps) {
  const {
    selectedModel,
    setSelectedModel,
    input,
    setInput,
    sendMessage,
    error,
    sending,
  } = useChat({
    projectId: project.id,
  });

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
              Project
            </div>

            <h1 className="font-medium">
              {project.name}
            </h1>
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

        <section className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold">
              {project.name}
            </h2>

            <p className="mt-2 text-zinc-500">
              Chats and context for this project.
            </p>

            {projectConversations.length >
              0 && (
              <div className="mt-8">
                <div className="mb-3 text-sm font-medium text-zinc-400">
                  Recent chats
                </div>

                <div className="space-y-2">
                  {projectConversations.map(
                    (conversation) => (
                      <Link
                        key={conversation.id}
                        href={`/c/${conversation.id}`}
                        className="block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 transition hover:bg-zinc-800"
                      >
                        {conversation.title ??
                          "Untitled chat"}
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
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
              placeholder={`Message AJ in ${project.name}...`}
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