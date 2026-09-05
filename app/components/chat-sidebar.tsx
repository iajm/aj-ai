"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConversationSummary } from "../lib/types";

type ChatSidebarProps = {
  conversations: ConversationSummary[];
};

export default function ChatSidebar({
  conversations,
}: ChatSidebarProps) {
  const pathname = usePathname();

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
        <div className="mb-2 px-2 pt-3 text-xs font-medium uppercase tracking-wide text-zinc-600">
          Conversations
        </div>

        {conversations.length === 0 ? (
          <p className="px-2 py-2 text-sm text-zinc-600">
            No chats yet
          </p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const href = `/c/${conversation.id}`;
              const active = pathname === href;

              return (
                <Link
                  key={conversation.id}
                  href={href}
                  title={
                    conversation.title ?? "Untitled chat"
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
            })}
          </div>
        )}
      </div>
    </aside>
  );
}