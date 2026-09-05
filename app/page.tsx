import HomeClient from "./home-client";
import { getConversations } from "./lib/conversations";
import { getProjects } from "./lib/projects";

export default async function HomePage() {
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