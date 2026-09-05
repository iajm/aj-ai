"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase/client";

export default function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function createProject() {
    const trimmedName = name.trim();

    if (!trimmedName || creating) {
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: project, error: projectError } =
        await supabase
          .from("projects")
          .insert({
            name: trimmedName,
          })
          .select("id")
          .single();

      if (projectError || !project) {
        console.error(
          "Project creation failed:",
          projectError
        );

        setError("Could not create project.");
        return;
      }

      setName("");
      setOpen(false);

      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (requestError) {
      console.error(
        "Unexpected project creation error:",
        requestError
      );

      setError("Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="New project"
        className="rounded px-2 text-sm text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
      >
        +
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-zinc-100">
          Create project
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          Give your new project a name.
        </p>

        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              createProject();
            }

            if (event.key === "Escape") {
              setOpen(false);
              setError(null);
            }
          }}
          placeholder="Project name"
          disabled={creating}
          className="mt-5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-50"
        />

        {error && (
          <p className="mt-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={creating}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={createProject}
            disabled={!name.trim() || creating}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}