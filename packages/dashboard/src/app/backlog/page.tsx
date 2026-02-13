import { KanbanSquare } from "lucide-react";

export default function BacklogPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
      <KanbanSquare className="w-16 h-16 text-accent/30" />
      <h2 className="text-xl font-semibold text-foreground">Backlog</h2>
      <p className="text-sm">Linear-style project manager — coming in Phase 6</p>
    </div>
  );
}
