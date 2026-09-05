import HomeClient from "./home-client";
import { requireUser } from "./lib/auth";
import { getConversations } from "./lib/conversations";
import { getProjects } from "./lib/projects";

export default async function HomePage() {
  await requireUser();

  const [conversations, projects] =
    await Promise.all([
      getConversations(),
      getProjects(),
    ]);

  return (
    <HomeClient
      conversations={conversations}
      projects={projects}
    />
  );
}