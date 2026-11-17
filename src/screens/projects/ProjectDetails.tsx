import { getProjectBySlug } from "@/cms/sanityClient";
import { Button } from "@/components/ui/button";
import { mockProjects } from "@/data/mockProjects";
import { getProjectImageUrl } from "@/lib/projectUtils";
import { Project } from "@/types/Project";
import React, { useEffect } from "react";
import { Link, useParams } from "react-router";

const ProjectDetails: React.FC = () => {
  const { slug } = useParams();
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function getAndSetProjects(): Promise<void> {
      try {
        const fetched = await getProjectBySlug(slug as string);
        if (fetched) {
          setProject(fetched);
        } else {
          const mock = mockProjects.find((m) => m.id === slug);
          setProject(mock || null);
        }
      } catch {
        const mock = mockProjects.find((m) => m.id === slug);
        setProject(mock || null);
      } finally {
        setLoading(false);
      }
    }

    if (slug) getAndSetProjects();
  }, [slug]);

  if (!project && !loading) {
    return (
      <section className="min-h-screen px-6 py-16 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
        <p className="text-muted-foreground mb-6">Could not find the requested project.</p>
        <Link to="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </section>
    );
  }

  if (!project) return null;

  const imageUrl = getProjectImageUrl(project.image) || "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";

  return (
    <section className="min-h-screen px-6 py-16 bg-gradient-to-b from-background to-muted text-foreground">
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <svg
            className="animate-spin h-10 w-10 text-accent"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="4"
              stroke="currentColor"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4.93 4.93a10 10 0 0 1 14.14 14.14L12 12l-7.07-7.07z"
            />
          </svg>
        </div>
      ) : null}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{project.title}</h1>
        <img
          src={imageUrl}
          alt={project.title}
          className="w-full rounded-xl mb-8 max-h-[500px] object-cover shadow-lg"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop";
          }}
        />
        <p className="text-lg leading-relaxed mb-8 text-foreground">
          {project.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {project.live_link && (
            <Button asChild className="min-w-[200px]">
              <a
                href={project.live_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit Live Site
              </a>
            </Button>
          )}

          {project.github_repo && (
            <Button asChild variant="secondary" className="min-w-[200px]">
              <a
                href={project.github_repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Source Code
              </a>
            </Button>
          )}

          <Button asChild variant="outline" className="min-w-[150px]">
            <Link to="/">Back to Station</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectDetails;
