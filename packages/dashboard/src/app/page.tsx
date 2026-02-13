import { Brain } from "lucide-react";

export default function BrainViewPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted">
      <Brain className="w-16 h-16 text-accent/30" />
      <h2 className="text-xl font-semibold text-foreground">Brain View</h2>
      <p className="text-sm">3D knowledge graph — coming in Phase 4</p>
    </div>
  );
}
