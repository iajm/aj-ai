"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ChatSidebar from "../../components/chat-sidebar";
import { useChat } from "../../hooks/useChat";
import {
  ChatMessage,
  ConversationSummary,
  ProjectSummary,
} from "../../lib/types";

type ChatClientProps = {
  conversationId: string;
  title: string | null;
  initialMessages: ChatMessage[];
  conversations: ConversationSummary[];
  projects: ProjectSummary[];
};

export default function ChatClient({
  conversationId,
  title,
  initialMessages,
  conversations,
  projects,
}: ChatClientProps) {
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
    initialMessages,
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isStreaming]);

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(
        message.content
      );

      setCopiedId(message.id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === message.id ? null : current
        );
      }, 1500);
    } catch (copyError) {
      console.error(
        "Could not copy message:",
        copyError
      );
    }
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <ChatSidebar
        conversations={conversations}
        projects={projects}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[70px] items-center justify-between border-b border-zinc-800 px-6">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">
              ClaudeGPT
            </div>

            <h1 className="truncate font-medium">
              {title ?? "New Chat"}
            </h1>
          </div>

          <div className="ml-4 flex shrink-0 rounded-lg bg-zinc-900 p-1">
            <button
              type="button"
              disabled={sending}
              onClick={() => setSelectedModel("gpt")}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                selectedModel === "gpt"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              GPT
            </button>

            <button
              type="button"
              disabled={sending}
              onClick={() => setSelectedModel("claude")}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                selectedModel === "claude"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Claude
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl space-y-7 px-6 py-8">
            {messages.map((message) => {
              const label =
                message.role === "user"
                  ? "YOU"
                  : message.provider === "openai"
                    ? "GPT"
                    : message.provider === "anthropic"
                      ? "CLAUDE"
                      : "ASSISTANT";

              const isLive =
                message.id === streamingMessageId;

              const isWaiting =
                isLive && !message.content;

              return (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-2xl"
                      : "mr-auto w-full max-w-3xl"
                  }
                >
                  <div className="mb-1.5 text-xs font-medium tracking-wide text-zinc-500">
                    {label}
                  </div>

                  <div
                    className={`${
                      message.role === "user"
                        ? "rounded-2xl bg-zinc-800 px-4 py-3"
                        : "px-1 py-2"
                    } ${
                      message.status === "pending" &&
                      message.role === "user"
                        ? "opacity-60"
                        : ""
                    } ${
                      message.status === "failed"
                        ? "rounded-2xl border border-red-800"
                        : ""
                    }`}
                  >
                    {isWaiting ? (
                      <div className="flex h-7 items-center gap-1.5 text-zinc-500">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                      </div>
                    ) : message.role === "assistant" ? (
                      <div className="leading-7 text-zinc-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p({ children }) {
                              return (
                                <p className="my-3 first:mt-0 last:mb-0">
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
                                <ul className="my-3 list-disc space-y-1 pl-6">
                                  {children}
                                </ul>
                              );
                            },
                            ol({ children }) {
                              return (
                                <ol className="my-3 list-decimal space-y-1 pl-6">
                                  {children}
                                </ol>
                              );
                            },
                            h1({ children }) {
                              return (
                                <h1 className="mb-3 mt-6 text-2xl font-semibold text-zinc-50">
                                  {children}
                                </h1>
                              );
                            },
                            h2({ children }) {
                              return (
                                <h2 className="mb-2 mt-6 text-xl font-semibold text-zinc-50">
                                  {children}
                                </h2>
                              );
                            },
                            h3({ children }) {
                              return (
                                <h3 className="mb-2 mt-5 text-lg font-semibold text-zinc-50">
                                  {children}
                                </h3>
                              );
                            },
                            blockquote({ children }) {
                              return (
                                <blockquote className="my-4 border-l-2 border-zinc-700 pl-4 text-zinc-400">
                                  {children}
                                </blockquote>
                              );
                            },
                            code({ children, className }) {
                              if (className) {
                                return (
                                  <code className="block overflow-x-auto rounded-lg bg-zinc-900 p-4 font-mono text-sm leading-6 text-zinc-200">
                                    {children}
                                  </code>
                                );
                              }

                              return (
                                <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200">
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
                                  className="text-blue-400 underline decoration-blue-400/40 underline-offset-2 hover:text-blue-300"
                                >
                                  {children}
                                </a>
                              );
                            },
                            table({ children }) {
                              return (
                                <div className="my-4 overflow-x-auto">
                                  <table className="w-full border-collapse text-sm">
                                    {children}
                                  </table>
                                </div>
                              );
                            },
                            th({ children }) {
                              return (
                                <th className="border border-zinc-700 bg-zinc-900 px-3 py-2 text-left font-medium">
                                  {children}
                                </th>
                              );
                            },
                            td({ children }) {
                              return (
                                <td className="border border-zinc-800 px-3 py-2 align-top">
                                  {children}
                                </td>
                              );
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>

                        {isLive && message.content && (
                          <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-zinc-400 align-middle" />
                        )}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-7">
                        {message.content}
                      </div>
                    )}
                  </div>

                  {message.status === "failed" && (
                    <div className="mt-1 text-xs text-red-400">
                      Failed to save
                    </div>
                  )}

                  {message.role === "assistant" &&
                    message.status === "sent" &&
                    message.content && (
                      <div className="mt-1 flex items-center gap-2 px-1">
                        <button
                          type="button"
                          onClick={() => copyMessage(message)}
                          className="rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
                        >
                          {copiedId === message.id
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    )}
                </div>
              );
            })}

            <div ref={bottomRef} className="h-px" />
          </div>
        </section>

        <footer className="border-t border-zinc-800 bg-zinc-950 p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <textarea
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

                  if (!sending) {
                    sendMessage(input);
                  }
                }
              }}
              placeholder={`Message ${
                selectedModel === "gpt"
                  ? "GPT"
                  : "Claude"
              }...`}
              disabled={sending}
              rows={1}
              className="min-h-[50px] max-h-40 flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none transition focus:border-zinc-500 disabled:opacity-60"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={stopGenerating}
                className="rounded-xl bg-zinc-100 px-5 py-3 font-medium text-zinc-900 transition hover:bg-white"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                disabled={sending || !input.trim()}
                onClick={() => sendMessage(input)}
                className="rounded-xl bg-zinc-100 px-5 py-3 font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            )}
          </div>

          <div className="mx-auto mt-2 flex max-w-3xl items-center justify-between gap-4">
            <div>
              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}
            </div>

            {isStreaming && (
              <div className="shrink-0 text-xs text-zinc-600">
                {selectedModel === "gpt"
                  ? "GPT is responding"
                  : "Claude is responding"}
              </div>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
