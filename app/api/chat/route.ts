import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient } from "../../lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = "gpt-5.6-luna";

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

    // GPT only for this milestone.
    // Claude gets connected after GPT passes.
    if (selectedModel !== "gpt") {
      return NextResponse.json(
        { error: "Claude is not connected yet." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Confirm that the request belongs to a signed-in AJ user.
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

    // Verify that this conversation exists and belongs to the user.
    // RLS provides the ownership boundary.
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

    // Load AJ's canonical conversation history from the database.
    // Do not trust browser-supplied history.
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

    const input = (messages ?? []).map((message) => ({
      role:
        message.role === "assistant"
          ? ("assistant" as const)
          : ("user" as const),
      content: message.content,
    }));

    // Real OpenAI API call.
    const response = await openai.responses.create({
      model: OPENAI_MODEL,

      instructions:
        "You are AJ, a personal AI assistant. Respond naturally and helpfully. Continue the conversation using the provided conversation history.",

      input,
    });

    const assistantText = response.output_text.trim();

    if (!assistantText) {
      console.error(
        "OpenAI returned no assistant text:",
        response.id
      );

      return NextResponse.json(
        { error: "GPT returned an empty response." },
        { status: 502 }
      );
    }

    // IMPORTANT:
    // Persist the paid model response on the server BEFORE
    // returning it to the browser.
    const {
      data: savedAssistantMessage,
      error: assistantMessageError,
    } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: assistantText,
        provider: "openai",
        model: OPENAI_MODEL,
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
            "GPT replied, but AJ could not save the response.",
        },
        { status: 500 }
      );
    }

    // Only return the assistant message after it exists
    // durably in AJ's database.
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