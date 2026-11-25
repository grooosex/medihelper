import { createFileRoute } from "@tanstack/react-router";
import { Assistant } from "@/components/assistant/assistant";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Assistant />;
}
