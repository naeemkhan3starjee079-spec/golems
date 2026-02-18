export type GraphNode = {
  id: string;
  session_id: string;
  label: string;
  community: {
    coarse: number;
    medium: number;
    fine: number;
  };
  x: number;
  y: number;
  z: number;
  size: number;
  color_type: string;
  source?: string;
  project: string;
  branch: string;
  plan: string;
  chunk_count: number;
  files_count: number;
  started_at: string;
  importance: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
};

export type CommunityInfo = {
  label: string;
  members: string[];
  size: number;
};

export type GraphHierarchy = {
  coarse: Record<string, CommunityInfo>;
  medium: Record<string, CommunityInfo>;
  fine: Record<string, CommunityInfo>;
};

export type GraphMeta = {
  generated_at: string;
  session_count: number;
  node_count: number;
  edge_count: number;
  community_counts: {
    coarse: number;
    medium: number;
    fine: number;
  };
};

export type GraphFilters = {
  projects: string[];
  sources: string[];
  intents: string[];
};

export type BrainGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hierarchy: GraphHierarchy;
  meta: GraphMeta;
};
