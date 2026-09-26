import type { LibraryAsset } from "../../types";

export type MetadataStatusFilter = "all" | "pending" | "queued" | "processing" | "completed" | "failed" | "cancelled";

export type MetadataViewTab = "all" | "needs_metadata" | "generating" | "generated";

export interface MetadataJobItem {
  id: string; // job id or asset id
  assetId: string;
  asset?: LibraryAsset;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled" | "pending";
  progress?: number;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface MetadataFilterState {
  search: string;
  status: MetadataStatusFilter;
  category: string;
  type?: string;
}

export interface PlatformRuleItem {
  id: string;
  label: string;
  status: "passed" | "warning" | "failed";
  detail?: string;
}
