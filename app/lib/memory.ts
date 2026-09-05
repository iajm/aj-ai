import OpenAI from "openai";
import { createClient } from "./supabase/server";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type MemoryMatch = {
  message_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  provider: "openai" | "anthropic" | null;
  model: string | null;
  created_at: string;
  similarity: number;
};

type EmbedMessageOptions = {
  force?: boolean;
};

export type BackfillResult = {
  processed: number;
  embedded: number;
  skipped: number;
  failed: number;
  hasMore: boolean;
};

export async function createEmbedding(
  text: string
): Promise<number[]> {
  const cleaned = text.trim();

  if (!cleaned) {
    throw new Error("Cannot embed empty text.");
  }

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: cleaned,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0]?.embedding;

  if (!embedding) {
    throw new Error(
      "OpenAI returned no embedding."
    );
  }

  return embedding;
}

export async function embedMessage(
  messageId: string,
  options: EmbedMessageOptions = {}
): Promise<"embedded" | "skipped"> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  /*
   * Don't regenerate an embedding that already exists
   * unless force=true.
   */
  if (!options.force) {
    const {
      data: existingEmbedding,
      error: existingEmbeddingError,
    } = await supabase
      .from("message_embeddings")
      .select("message_id, embedding_model")
      .eq("message_id", messageId)
      .maybeSingle();

    if (existingEmbeddingError) {
      throw new Error(
        `Could not check existing embedding: ${existingEmbeddingError.message}`
      );
    }

    if (
      existingEmbedding &&
      existingEmbedding.embedding_model ===
        EMBEDDING_MODEL
    ) {
      return "skipped";
    }
  }

  /*
   * RLS on messages/conversations ensures the current
   * user can only index their own messages.
   */
  const {
    data: message,
    error: messageError,
  } = await supabase
    .from("messages")
    .select(`
      id,
      conversation_id,
      content,
      conversations!inner (
        user_id
      )
    `)
    .eq("id", messageId)
    .single();

  if (messageError || !message) {
    throw new Error("Message not found.");
  }

  const embedding = await createEmbedding(
    message.content
  );

  const { error: embeddingError } =
    await supabase
      .from("message_embeddings")
      .upsert(
        {
          message_id: message.id,
          user_id: user.id,
          conversation_id:
            message.conversation_id,
          embedding,
          embedding_model: EMBEDDING_MODEL,
        },
        {
          onConflict: "message_id",
        }
      );

  if (embeddingError) {
    throw new Error(
      `Could not save embedding: ${embeddingError.message}`
    );
  }

  return "embedded";
}

export async function searchMemory(
  query: string,
  currentConversationId: string,
  limit = 12
): Promise<MemoryMatch[]> {
  const supabase = await createClient();

  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    return [];
  }

  const queryEmbedding =
    await createEmbedding(cleanedQuery);

  /*
   * Ask Postgres for more candidates than we ultimately
   * need. This gives us room to consider both semantic
   * relevance and recency below.
   */
  const candidateCount = Math.min(
    Math.max(limit * 3, 20),
    20
  );

  const { data, error } = await supabase.rpc(
    "match_message_embeddings",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.25,
      match_count: candidateCount,
      exclude_conversation_id:
        currentConversationId,
    }
  );

  if (error) {
    console.error(
      "Memory search failed:",
      error
    );

    return [];
  }

  const candidates =
    (data ?? []) as MemoryMatch[];

  /*
   * V1.1 retrieval:
   *
   * Semantic similarity remains the main signal.
   * For memories that are similarly relevant, newer
   * information gets a modest boost.
   *
   * We DO NOT delete or overwrite old information.
   * Historical messages remain available forever.
   *
   * Proper current/historical structured state comes
   * later and will handle explicit fact supersession
   * more reliably than vector search alone.
   */
  const now = Date.now();

  const ranked = candidates.map((memory) => {
    const timestamp = new Date(
      memory.created_at
    ).getTime();

    const ageInDays = Number.isFinite(timestamp)
      ? Math.max(
          0,
          (now - timestamp) /
            (1000 * 60 * 60 * 24)
        )
      : 3650;

    /*
     * Maximum recency bonus is 0.08.
     * It decays gradually as a memory gets older.
     */
    const recencyBonus =
      0.08 *
      Math.exp(-ageInDays / 180);

    /*
     * Direct user statements get a small preference
     * over assistant-generated text.
     */
    const userBonus =
      memory.role === "user" ? 0.03 : 0;

    return {
      memory,
      score:
        memory.similarity +
        recencyBonus +
        userBonus,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return (
      new Date(
        b.memory.created_at
      ).getTime() -
      new Date(
        a.memory.created_at
      ).getTime()
    );
  });

  return ranked
    .slice(0, limit)
    .map((item) => item.memory);
}

export function formatMemories(
  memories: MemoryMatch[]
): string {
  if (memories.length === 0) {
    return "No relevant memories were retrieved.";
  }

  /*
   * Put retrieved context into chronological order
   * before presenting it to the model.
   *
   * This makes updates easier to understand:
   *
   * older: Mango
   * newer: Abdul
   *
   * rather than presenting memories in arbitrary
   * similarity order.
   */
  const chronological = [...memories].sort(
    (a, b) =>
      new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime()
  );

  return chronological
    .map((memory) => {
      const source =
        memory.role === "user"
          ? "USER"
          : memory.provider === "anthropic"
            ? "CLAUDE"
            : memory.provider === "openai"
              ? "CHATGPT"
              : "ASSISTANT";

      return [
        `[${memory.created_at}] ${source}`,
        memory.content,
      ].join("\n");
    })
    .join("\n\n");
}

/*
 * Backfill messages that existed before the memory
 * system was introduced.
 *
 * This processes a limited batch at a time so a large
 * history doesn't create one giant expensive request.
 */
export async function backfillMessageEmbeddings(
  batchSize = 25
): Promise<BackfillResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Not authenticated.");
  }

  const safeBatchSize = Math.min(
    Math.max(batchSize, 1),
    50
  );

  /*
   * Load the user's messages through conversations.
   * RLS remains the security boundary.
   */
  const {
    data: messages,
    error: messagesError,
  } = await supabase
    .from("messages")
    .select(`
      id,
      created_at,
      conversations!inner (
        user_id
      )
    `)
    .eq("conversations.user_id", user.id)
    .order("created_at", {
      ascending: true,
    });

  if (messagesError) {
    throw new Error(
      `Could not load messages for backfill: ${messagesError.message}`
    );
  }

  const allMessages = messages ?? [];

  if (allMessages.length === 0) {
    return {
      processed: 0,
      embedded: 0,
      skipped: 0,
      failed: 0,
      hasMore: false,
    };
  }

  /*
   * Find which message IDs already have current-model
   * embeddings.
   */
  const {
    data: existingRows,
    error: existingRowsError,
  } = await supabase
    .from("message_embeddings")
    .select("message_id, embedding_model");

  if (existingRowsError) {
    throw new Error(
      `Could not load existing embeddings: ${existingRowsError.message}`
    );
  }

  const alreadyIndexed = new Set(
    (existingRows ?? [])
      .filter(
        (row) =>
          row.embedding_model ===
          EMBEDDING_MODEL
      )
      .map((row) => row.message_id)
  );

  const missingMessages = allMessages.filter(
    (message) =>
      !alreadyIndexed.has(message.id)
  );

  const batch = missingMessages.slice(
    0,
    safeBatchSize
  );

  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  /*
   * Sequential processing is intentional for our
   * one-user MVP. It avoids hammering the embeddings
   * API with a large burst.
   */
  for (const message of batch) {
    try {
      const result = await embedMessage(
        message.id
      );

      if (result === "embedded") {
        embedded += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;

      console.error(
        `Backfill failed for message ${message.id}:`,
        error
      );
    }
  }

  return {
    processed: batch.length,
    embedded,
    skipped,
    failed,
    hasMore:
      missingMessages.length >
      batch.length,
  };
}