import HomeClient from "./home-client";
import { getConversations } from "./lib/conversations";

export default async function HomePage() {
  const conversations =
    await getConversations();

  return (
    <HomeClient
      conversations={conversations}
    />
  );
}