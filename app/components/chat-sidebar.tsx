"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ConversationSummary,
  ProjectSummary,
} from "../lib/types";

type ChatSidebarProps = {
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function ChatSidebar({
  conversations,
  projects,
}: ChatSidebarProps) {
  const pathname = usePathname();

  const regularConversations =
    conversations.filter(
      (conversation) => !conversation.projectId
    );

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="p-3">
        <Link
          href="/"
          className="mb-3 block px-2 py-2 text-sm font-semibold text-zinc-100"
        >
          AJ AI
        </Link>

        <Link
          href="/"
          className={`block rounded-lg px-3 py-2 text-sm transition ${
            pathname === "/"
              ? "bg-zinc-800 text-white"
              : "text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          + New Chat
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="mb-1 flex items-center justify-between px-2 pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-600">
            Projects
          </span>

          <span
            title="Project creation UI coming next"
            className="text-sm text-zinc-600"
          >
            +
          </span>
        </div>

        <div className="space-y-1">
          {projects.map((project) => {
            const href = `/projects/${project.id}`;

            const active =
              pathname === href;

            return (
              <Link
                key={project.id}
                href={href}
                className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {project.name}
              </Link>
            );
          })}
        </div>

        <div className="mb-2 mt-6 px-2 text-xs font-medium uppercase tracking-wide text-zinc-600">
          Chats
        </div>

        {regularConversations.length === 0 ? (
          <p className="px-2 py-2 text-sm text-zinc-600">
            No regular chats yet
          </p>
        ) : (
          <div className="space-y-1">
            {regularConversations.map(
              (conversation) => {
                const href = `/c/${conversation.id}`;

                const active =
                  pathname === href;

                return (
                  <Link
                    key={conversation.id}
                    href={href}
                    title={
                      conversation.title ??
                      "Untitled chat"
                    }
                    className={`block truncate rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    {conversation.title ??
                      "Untitled chat"}
                  </Link>
                );
              }
            )}
          </div>
        )}
      </div>
    </aside>
  );
}