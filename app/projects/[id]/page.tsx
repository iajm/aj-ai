import { getConversations } from "../../lib/conversations";
import {
  getProject,
  getProjects,
} from "../../lib/projects";
import ProjectClient from "./project-client";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { id } = await params;

  const [project, projects, conversations] =
    await Promise.all([
      getProject(id),
      getProjects(),
      getConversations(),
    ]);

  if (!project) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
        <p className="text-red-400">
          Project not found.
        </p>
      </main>
    );
  }

  const projectConversations =
    conversations.filter(
      (conversation) =>
        conversation.projectId === project.id
    );

  return (
    <ProjectClient
      project={project}
      projects={projects}
      conversations={conversations}
      projectConversations={
        projectConversations
      }
    />
  );
}