import { deleteProjectDB, getProjectDB, getProjectsDB, saveProjectDB } from "./storage";

export interface ImaginProject {
  projectId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
  jobIds: string[];
  assetCount: number;
  settings: Record<string, unknown>;
}

export const createProject = (name = "Untitled Project", settings: Record<string, unknown> = {}): ImaginProject => ({
  projectId: `project_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: name || "Untitled Project",
  description: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  archivedAt: null,
  jobIds: [],
  assetCount: 0,
  settings,
});

export const projectEngine = {
  create: (name?: string, settings?: Record<string, unknown>) => createProject(name, settings),
  async save(project: ImaginProject): Promise<ImaginProject> {
    const next = { ...project, updatedAt: Date.now() };
    await saveProjectDB(next);
    return next;
  },
  async open(projectId: string) { return getProjectDB(projectId); },
  async list(includeArchived = false) { return getProjectsDB(includeArchived); },
  async duplicate(project: ImaginProject): Promise<ImaginProject> {
    const copy = createProject(`${project.name} (copy)`, project.settings);
    copy.jobIds = [...(project.jobIds || [])];
    copy.description = project.description;
    await saveProjectDB(copy);
    return copy;
  },
  async archive(project: ImaginProject): Promise<ImaginProject> {
    const next = { ...project, archivedAt: Date.now(), updatedAt: Date.now() };
    await saveProjectDB(next);
    return next;
  },
  async unarchive(project: ImaginProject): Promise<ImaginProject> {
    const next = { ...project, archivedAt: null, updatedAt: Date.now() };
    await saveProjectDB(next);
    return next;
  },
  async remove(projectId: string): Promise<void> { await deleteProjectDB(projectId); },
  async attachJob(project: ImaginProject, jobId: string): Promise<ImaginProject> {
    const next = { ...project, jobIds: [...new Set([...(project.jobIds || []), jobId])], updatedAt: Date.now() };
    await saveProjectDB(next);
    return next;
  },
};
