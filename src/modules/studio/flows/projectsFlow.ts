import { projectEngine, type ImaginProject } from '../engines/project-engine';
import { deriveProductionPolicy, feedbackEngine } from '../engines/feedback';
import type { ShowToast } from './uiFlow';

export type ProjectsFlowContext = {
  projects: ImaginProject[];
  setProjects: (update: (previous: ImaginProject[]) => ImaginProject[]) => void;
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;
  setSidebarProjectOpen: (open: boolean) => void;
  showToast: ShowToast;
};

export type RejectionFeedbackContext = {
  isHistoryOpen: boolean;
  setRejectionInsights: (insights: any) => void;
};

export async function handleCreateProject(ctx: ProjectsFlowContext, name = '') {
  const proj = projectEngine.create(name || `Project ${ctx.projects.length + 1}`);
  const saved = await projectEngine.save(proj);
  ctx.setProjects(prev => [saved, ...prev]);
  ctx.setActiveProjectId(saved.projectId);
  void window.api?.studioSaveConfig?.({ activeProjectId: saved.projectId }).catch(() => {});
  ctx.showToast(`Project "${saved.name}" dibuat.`, 'success');
  return saved;
}

export function handleSwitchProject(ctx: ProjectsFlowContext, projectId: string | null) {
  ctx.setActiveProjectId(projectId);
  void window.api?.studioSaveConfig?.({ activeProjectId: projectId || '' }).catch(() => {});
}

export async function handleDuplicateProject(ctx: ProjectsFlowContext, project: ImaginProject) {
  const copy = await projectEngine.duplicate(project);
  ctx.setProjects(prev => [copy, ...prev]);
  ctx.showToast(`Project "${copy.name}" diduplikasi.`, 'info');
  return copy;
}

export async function handleArchiveProject(ctx: ProjectsFlowContext, project: ImaginProject) {
  // FIX (minor): toggle archive/unarchive — arsip punya indikator visual
  // di PROJECT panel, dan bisa dibalik kembali.
  const isArchived = project.archivedAt != null;
  const saved = isArchived
    ? await projectEngine.unarchive(project)
    : await projectEngine.archive(project);
  ctx.setProjects(prev => prev.map(p => p.projectId === saved.projectId ? saved : p));
  ctx.showToast(isArchived ? `Project "${project.name}" dipulihkan dari arsip.` : `Project "${project.name}" diarsipkan.`, 'info');
}

export async function handleDeleteProject(ctx: ProjectsFlowContext, projectId: string) {
  await projectEngine.remove(projectId);
  ctx.setProjects(prev => prev.filter(p => p.projectId !== projectId));
  if (ctx.activeProjectId === projectId) {
    ctx.setActiveProjectId(null);
    void window.api?.studioSaveConfig?.({ activeProjectId: '' }).catch(() => {});
  }
  ctx.showToast('Project dihapus.', 'info');
}

export function loadRejectionFeedback(ctx: RejectionFeedbackContext) {
  if (!ctx.isHistoryOpen) return;
  let cancelled = false;
  (async () => {
    try {
      const feedback = await feedbackEngine.list();
      if (cancelled) return;
      const policy = deriveProductionPolicy(feedback);
      ctx.setRejectionInsights(policy);
    } catch (err) {
      console.warn('[Imagin] Gagal memuat rejection insights:', err);
      if (!cancelled) ctx.setRejectionInsights(null);
    }
  })();
  return () => { cancelled = true; };
}
