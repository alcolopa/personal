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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm font-mono text-amber-200 select-none"
      onClick={onClose}
    >
      {/* In-Game Terminal Container */}
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl border-2 border-amber-400 bg-zinc-950 p-4 sm:p-5 shadow-[0_0_50px_rgba(245,158,11,0.35)] overflow-hidden text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-400/40">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-xs uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              STATION TERMINAL // PROJECT DATA-CARD
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-0.5">
              {currentIndex + 1} / {projects.length}
            </span>
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/25 text-amber-300 transition cursor-pointer"
              title="Resume (ESC)"
            >
              <X className="w-3.5 h-3.5" />
              <span>RESUME [ESC]</span>
            </button>
          </div>
        </div>

        {/* Project Selector Tabs */}
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar border-b border-zinc-800">
          <span className="text-[10px] uppercase text-zinc-500 whitespace-nowrap mr-1">
            TABS:
          </span>
          {projects.map((p, idx) => {
            const isSelected = p.id === current.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`px-2.5 py-0.5 text-xs rounded whitespace-nowrap transition cursor-pointer font-mono ${
                  isSelected
                    ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-200 hover:border-zinc-600'
                }`}
              >
                {idx + 1}. {p.title.slice(0, 15)}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-4 items-start overflow-y-auto">
          {/* Project Picture Showcase */}
          <div className="md:col-span-6 flex flex-col gap-2">
            <div className="relative aspect-video rounded-lg border-2 border-amber-400/60 overflow-hidden bg-zinc-900 shadow-lg">
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
                <div className="flex items-center justify-center h-full text-zinc-600">
                  No Preview Available
                </div>
              )}

              {current.is_featured && (
                <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] bg-amber-400 text-black font-bold rounded shadow">
                  FEATURED
                </span>
              )}
            </div>

            {/* Tags */}
            {current.tags && (
              <div className="flex flex-wrap gap-1 text-[11px] justify-center pt-1">
                {current.tags.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-zinc-900 border border-amber-400/30 text-amber-300/80">
                    [{t}]
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Project Info & Actions */}
          <div className="md:col-span-6 flex flex-col justify-between h-full gap-4">
            <div>
              <h3 className="text-xl font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                <span className="text-amber-500">&gt;</span> {current.title}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-h-44 overflow-y-auto pr-1 whitespace-pre-line border-l-2 border-zinc-800 pl-2">
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
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded bg-amber-400 text-black hover:bg-amber-300 transition shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  <Globe className="w-3.5 h-3.5" />
                  VISIT LIVE SITE
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {current.github_repo && (
                <a
                  href={current.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded border border-amber-400/60 bg-zinc-900 hover:bg-amber-400/20 text-amber-300 transition"
                >
                  <Github className="w-3.5 h-3.5" />
                  SOURCE CODE
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-amber-400/40 text-xs">
          <button
            onClick={handlePrev}
            className="flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-700 hover:border-amber-400 hover:text-amber-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>PREV [←]</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500">
            <span>Use ← → to browse</span>
            <span>·</span>
            <span>ESC to resume</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-700 hover:border-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              <span>NEXT [→]</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-amber-400 text-black font-bold hover:bg-amber-300 transition cursor-pointer"
            >
              RESUME GAME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectMenuModal;
