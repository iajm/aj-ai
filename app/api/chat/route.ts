import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const OPENAI_MODEL = "gpt-5.6-luna";
const ANTHROPIC_MODEL = "claude-sonnet-5";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const conversationId = body.conversationId;
    const selectedModel = body.selectedModel;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversation ID." },
        { status: 400 }
      );
    }

    if (
      selectedModel !== "gpt" &&
      selectedModel !== "claude"
    ) {
      return NextResponse.json(
        { error: "Invalid model selection." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    const {
      data: conversation,
      error: conversationError,
    } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const {
      data: messages,
      error: messagesError,
    } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("sequence", {
        ascending: true,
      });

    if (messagesError) {
      console.error(
        "Could not load conversation history:",
        messagesError
      );

      return NextResponse.json(
        { error: "Could not load conversation history." },
        { status: 500 }
      );
    }

    let assistantText: string;
    let provider: "openai" | "anthropic";
    let model: string;

    if (selectedModel === "gpt") {
      const input = (messages ?? []).map((message) => ({
        role:
          message.role === "assistant"
            ? ("assistant" as const)
            : ("user" as const),
        content: message.content,
      }));

      const response = await openai.responses.create({
        model: OPENAI_MODEL,

        instructions:
          "You are AJ, a personal AI assistant. Respond naturally and helpfully. Continue the conversation using the provided conversation history.",

        input,
      });

      assistantText = response.output_text.trim();
      provider = "openai";
      model = OPENAI_MODEL;
    } else {
      const claudeMessages = (messages ?? []).map(
        (message) => ({
          role:
            message.role === "assistant"
              ? ("assistant" as const)
              : ("user" as const),
          content: message.content,
        })
      );

      const response = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,

        system:
          "You are AJ, a personal AI assistant. Respond naturally and helpfully. Continue the conversation using the provided conversation history.",

        messages: claudeMessages,
      });

      assistantText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      provider = "anthropic";
      model = ANTHROPIC_MODEL;
    }

    if (!assistantText) {
      return NextResponse.json(
        { error: "The selected model returned an empty response." },
        { status: 502 }
      );
    }

    const {
      data: savedAssistantMessage,
      error: assistantMessageError,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
        provider,
        model,
      })
      .select(
        "id, role, content, provider, model, sequence, created_at"
      )
      .single();

    if (
      assistantMessageError ||
      !savedAssistantMessage
    ) {
      console.error(
        "Assistant persistence failed:",
        assistantMessageError
      );

      return NextResponse.json(
        {
          error:
            "The model replied, but AJ could not save the response.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: {
        id: savedAssistantMessage.id,
        role: "assistant",
        content: savedAssistantMessage.content,
        provider: savedAssistantMessage.provider,
        model: savedAssistantMessage.model,
        sequence: savedAssistantMessage.sequence,
        createdAt: savedAssistantMessage.created_at,
        status: "sent",
      },
    });
  } catch (error) {
    console.error("AJ chat route failed:", error);

    return NextResponse.json(
      { error: "AJ could not generate a response." },
      { status: 500 }
    );
  }
}