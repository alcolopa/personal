import React, { useEffect, useCallback } from 'react';
import { Project } from '@/types/Project';
import { getProjectImageUrl } from '@/lib/projectUtils';
import { Globe, Github, X, ChevronLeft, ChevronRight, Terminal, ExternalLink } from 'lucide-react';

interface ProjectMenuModalProps {
  project: Project | null;
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (p: Project) => void;
}

export const ProjectMenuModal: React.FC<ProjectMenuModalProps> = ({
  project,
  projects,
  isOpen,
  onClose,
  onSelectProject,
}) => {
  const currentIndex = project ? projects.findIndex((p) => p.id === project.id) : 0;
  const current = project || projects[0] || null;

  const handlePrev = useCallback(() => {
    if (!projects.length) return;
    const prevIdx = (currentIndex - 1 + projects.length) % projects.length;
    onSelectProject(projects[prevIdx]);
  }, [currentIndex, projects, onSelectProject]);

  const handleNext = useCallback(() => {
    if (!projects.length) return;
    const nextIdx = (currentIndex + 1) % projects.length;
    onSelectProject(projects[nextIdx]);
  }, [currentIndex, projects, onSelectProject]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !current) return null;

  const imageUrl = getProjectImageUrl(current.image);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md font-mono text-amber-200 select-none overflow-hidden"
      onClick={onClose}
    >
      {/* In-Game Terminal Container */}
      <div
        className="relative w-full max-w-3xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col rounded-xl border-2 border-amber-400 bg-zinc-950 shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-amber-400/40 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399] shrink-0" />
            <span className="text-xs uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5 truncate">
              <Terminal className="w-3.5 h-3.5 text-amber-400 shrink-0 hidden xs:inline" />
              <span>TERMINAL // DATA-CARD</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5">
              {currentIndex + 1}/{projects.length}
            </span>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/25 active:bg-amber-400/40 text-amber-300 transition cursor-pointer"
              title="Resume (ESC)"
            >
              <X className="w-3.5 h-3.5" />
              <span>RESUME</span>
            </button>
          </div>
        </div>

        {/* Project Selector Tabs */}
        <div className="flex items-center gap-1.5 px-3 sm:px-5 py-2 overflow-x-auto terminal-scrollbar border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <span className="text-[10px] uppercase text-zinc-500 whitespace-nowrap mr-1 shrink-0">
            PROJECTS:
          </span>
          {projects.map((p, idx) => {
            const isSelected = p.id === current.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`px-2.5 py-1 text-xs rounded whitespace-nowrap transition cursor-pointer font-mono shrink-0 ${
                  isSelected
                    ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-200 hover:border-zinc-600'
                }`}
              >
                <span className="block max-w-[10rem] sm:max-w-[14rem] truncate" title={p.title}>
                  {idx + 1}. {p.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body - Fully Responsive & Scrollable on Small Screens */}
        <div className="flex-1 min-h-0 overflow-y-auto terminal-scrollbar px-3 sm:px-5 py-3 sm:py-4 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-5 items-start">
            {/* Project Picture Showcase */}
            <div className="md:col-span-6 flex flex-col gap-2">
              <div className="relative aspect-video max-h-44 sm:max-h-56 md:max-h-none rounded-lg border-2 border-amber-400/60 overflow-hidden bg-zinc-900 shadow-lg">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={current.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),#09090b_70%)] px-4 text-center gap-2">
                    <Terminal className="w-8 h-8 text-amber-400/70" />
                    <span className="text-xs font-bold tracking-widest text-amber-300/90 uppercase">
                      {current.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                      CLI / SYSTEM UTILITY · DATA-CARD
                    </span>
                  </div>
                )}

                {current.is_featured && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-amber-400 text-black font-bold rounded shadow">
                    FEATURED
                  </span>
                )}
              </div>

              {/* Tags */}
              {current.tags && current.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 text-[10px] sm:text-[11px] justify-start sm:justify-center pt-1">
                  {current.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 rounded bg-zinc-900 border border-amber-400/30 text-amber-300/80">
                      [{t}]
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Project Info & Actions */}
            <div className="md:col-span-6 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
                  <span className="text-amber-500">&gt;</span> {current.title}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line border-l-2 border-zinc-800 pl-2.5">
                  {current.description || 'No description provided.'}
                </p>
              </div>

              {/* Action Links */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {current.live_link && (
                  <a
                    href={current.live_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded bg-amber-400 text-black hover:bg-amber-300 active:scale-[0.98] transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>VISIT LIVE SITE</span>
                    <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                  </a>
                )}
                {current.github_repo && (
                  <a
                    href={current.github_repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded border border-amber-400/60 bg-zinc-900 hover:bg-amber-400/20 active:scale-[0.98] text-amber-300 transition"
                  >
                    <Github className="w-3.5 h-3.5 shrink-0" />
                    <span>SOURCE CODE</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation - Always Visible & Finger-Friendly */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-amber-400/40 bg-zinc-950 shrink-0 text-xs">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded border border-zinc-700 hover:border-amber-400 active:bg-amber-400/20 text-zinc-300 hover:text-amber-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">PREV [←]</span>
            <span className="sm:hidden">PREV</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
            <span>Use ← → to browse</span>
            <span>·</span>
            <span>ESC to resume</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded border border-zinc-700 hover:border-amber-400 active:bg-amber-400/20 text-zinc-300 hover:text-amber-300 transition cursor-pointer"
            >
              <span className="hidden sm:inline">NEXT [→]</span>
              <span className="sm:hidden">NEXT</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 min-h-[36px] rounded bg-amber-400 text-black font-bold hover:bg-amber-300 active:bg-amber-500 transition cursor-pointer"
            >
              RESUME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMenuModal;
