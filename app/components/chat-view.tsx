"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatSidebar from "./chat-sidebar";
import { useChat } from "../hooks/useChat";
import {
  ChatMessage,
  ConversationSummary,
  ProjectSummary,
} from "../lib/types";

type ChatViewProps = {
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
  conversationId?: string | null;
  projectId?: string | null;
  initialMessages?: ChatMessage[];
  pageTitle?: string;
  pageLabel?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  projectConversations?: ConversationSummary[];
};

export default function ChatView({
  conversations,
  projects,
  conversationId = null,
  projectId = null,
  initialMessages = [],
  pageTitle = "New Chat",
  pageLabel = "ClaudeGPT",
  emptyTitle = "How can I help?",
  emptySubtitle = "One memory. Two AI brains.",
  projectConversations = [],
}: ChatViewProps) {
  const {
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
  } = useChat({
    conversationId,
    projectId,
    initialMessages,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height =
      `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === message.id ? null : current
        );
      }, 1500);
    } catch (copyError) {
      console.error("Could not copy message:", copyError);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b0c] text-zinc-100">
      <ChatSidebar
        conversations={conversations}
        projects={projects}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-white/5 px-5">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-600">
              {pageLabel}
            </div>

            <div className="truncate text-sm font-medium text-zinc-300">
              {pageTitle}
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex min-h-full items-center justify-center px-6 pb-40">
              <div className="w-full max-w-2xl text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">
                  {emptyTitle}
                </h1>

                <p className="mt-3 text-sm text-zinc-500">
                  {emptySubtitle}
                </p>

                {projectConversations.length > 0 && (
                  <div className="mx-auto mt-10 max-w-xl text-left">
                    <div className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-zinc-600">
                      Recent chats
                    </div>

                    <div className="space-y-2">
                      {projectConversations.map((conversation) => (
                        <Link
                          key={conversation.id}
                          href={`/c/${conversation.id}`}
                          className="block rounded-2xl border border-white/5 bg-white/[0.025] px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.05]"
                        >
                          {conversation.title ?? "Untitled chat"}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-5 pb-40 pt-8">
              <div className="space-y-8">
                {messages.map((message) => {
                  const isLive =
                    message.id === streamingMessageId;

                  const isWaiting =
                    isLive && !message.content;

                  const assistantName =
                    message.provider === "anthropic"
                      ? "Claude"
                      : message.provider === "openai"
                        ? "GPT"
                        : "Assistant";

                  return (
                    <div
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      {message.role === "user" ? (
                        <div className="max-w-[80%] rounded-[22px] bg-[#2a2a2d] px-4 py-3 text-[15px] leading-6 text-zinc-100">
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>

                          {message.status === "failed" && (
                            <div className="mt-2 text-xs text-red-400">
                              Failed to save
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="mb-2 flex items-center gap-2">
                            <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/5 px-2 text-[10px] font-medium text-zinc-400">
                              {assistantName}
                            </div>

                            {isLive && !isWaiting && (
                              <div className="text-[11px] text-zinc-600">
                                responding
                              </div>
                            )}
                          </div>

                          <div className="text-[15px] leading-7 text-zinc-200">
                            {isWaiting ? (
                              <div className="flex h-8 items-center gap-1.5 text-zinc-500">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                              </div>
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p({ children }) {
                                    return (
                                      <p className="my-4 first:mt-0 last:mb-0">
                                        {children}
                                      </p>
                                    );
                                  },

                                  strong({ children }) {
                                    return (
                                      <strong className="font-semibold text-zinc-50">
                                        {children}
                                      </strong>
                                    );
                                  },

                                  ul({ children }) {
                                    return (
                                      <ul className="my-4 list-disc space-y-2 pl-6">
                                        {children}
                                      </ul>
                                    );
                                  },

                                  ol({ children }) {
                                    return (
                                      <ol className="my-4 list-decimal space-y-2 pl-6">
                                        {children}
                                      </ol>
                                    );
                                  },

                                  li({ children }) {
                                    return (
                                      <li className="pl-1">
                                        {children}
                                      </li>
                                    );
                                  },

                                  h1({ children }) {
                                    return (
                                      <h1 className="mb-4 mt-7 text-2xl font-semibold text-zinc-50">
                                        {children}
                                      </h1>
                                    );
                                  },

                                  h2({ children }) {
                                    return (
                                      <h2 className="mb-3 mt-7 text-xl font-semibold text-zinc-50">
                                        {children}
                                      </h2>
                                    );
                                  },

                                  h3({ children }) {
                                    return (
                                      <h3 className="mb-2 mt-6 text-lg font-semibold text-zinc-50">
                                        {children}
                                      </h3>
                                    );
                                  },

                                  blockquote({ children }) {
                                    return (
                                      <blockquote className="my-5 border-l-2 border-zinc-700 pl-4 text-zinc-400">
                                        {children}
                                      </blockquote>
                                    );
                                  },

                                  code({ children, className }) {
                                    if (className) {
                                      return (
                                        <code className="my-4 block overflow-x-auto rounded-xl bg-[#171719] p-4 font-mono text-sm leading-6 text-zinc-200">
                                          {children}
                                        </code>
                                      );
                                    }

                                    return (
                                      <code className="rounded-md bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
                                        {children}
                                      </code>
                                    );
                                  },

                                  a({ children, href }) {
                                    return (
                                      <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-400 underline decoration-blue-400/30 underline-offset-2 hover:text-blue-300"
                                      >
                                        {children}
                                      </a>
                                    );
                                  },

                                  table({ children }) {
                                    return (
                                      <div className="my-5 overflow-x-auto rounded-xl border border-white/5">
                                        <table className="w-full border-collapse text-sm">
                                          {children}
                                        </table>
                                      </div>
                                    );
                                  },

                                  th({ children }) {
                                    return (
                                      <th className="border-b border-white/5 bg-white/[0.03] px-3 py-2 text-left font-medium text-zinc-300">
                                        {children}
                                      </th>
                                    );
                                  },

                                  td({ children }) {
                                    return (
                                      <td className="border-b border-white/5 px-3 py-2 align-top">
                                        {children}
                                      </td>
                                    );
                                  },
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            )}

                            {isLive && message.content && (
                              <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-zinc-400 align-middle" />
                            )}
                          </div>

                          {message.status === "sent" &&
                            message.content && (
                              <div className="mt-3 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyMessage(message)
                                  }
                                  className="rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300"
                                >
                                  {copiedId === message.id
                                    ? "Copied"
                                    : "Copy"}
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div ref={bottomRef} className="h-px" />
              </div>
            </div>
          )}
        </section>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0b0b0c] via-[#0b0b0c] to-transparent px-4 pb-4 pt-16">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <div className="rounded-[26px] border border-white/10 bg-[#202022] shadow-2xl shadow-black/30 transition focus-within:border-white/15">
              <textarea
                ref={textareaRef}
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

                    if (!sending && input.trim()) {
                      sendMessage(input);
                    }
                  }
                }}
                rows={1}
                disabled={sending}
                placeholder="Ask anything"
                className="max-h-[200px] min-h-[54px] w-full resize-none bg-transparent px-5 pb-2 pt-4 text-[15px] leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 disabled:opacity-60"
              />

              <div className="flex items-center justify-between gap-3 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Attachments coming later"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-xl font-light text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                  >
                    +
                  </button>

                  <div className="flex rounded-full bg-black/20 p-1">
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setSelectedModel("gpt")}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        selectedModel === "gpt"
                          ? "bg-white/10 text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-300"
                      } disabled:opacity-40`}
                    >
                      GPT
                    </button>

                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => setSelectedModel("claude")}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        selectedModel === "claude"
                          ? "bg-white/10 text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-300"
                      } disabled:opacity-40`}
                    >
                      Claude
                    </button>
                  </div>
                </div>

                {isStreaming ? (
                  <button
                    type="button"
                    onClick={stopGenerating}
                    title="Stop generating"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-950 transition hover:bg-white"
                  >
                    <span className="h-2.5 w-2.5 rounded-[2px] bg-zinc-900" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={sending || !input.trim()}
                    onClick={() => sendMessage(input)}
                    title="Send message"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-lg font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    ↑
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="mt-2 px-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-2 text-center text-[11px] text-zinc-700">
              ClaudeGPT can make mistakes. Check important information.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
