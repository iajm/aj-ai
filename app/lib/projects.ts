import { createClient } from "./supabase/server";
import { ProjectSummary } from "./types";

export async function getProjects(): Promise<ProjectSummary[]> {
  const supabase = await createClient();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, instructions, created_at, updated_at"
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("Could not load projects:", error);
    return [];
  }

  return (projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    instructions: project.instructions,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }));
}

export async function getProject(
  projectId: string
): Promise<ProjectSummary | null> {
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id, name, description, instructions, created_at, updated_at"
    )
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    instructions: project.instructions,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}