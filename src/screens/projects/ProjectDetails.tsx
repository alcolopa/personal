import { getProjectBySlug } from "@/cms/sanityClient";
import urlFor from "@/cms/urlBuilder";
import { Button } from "@/components/ui/button";
import { Project } from "@/types/Project";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router";

const ProjectDetails: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function getAndSetProjects(): Promise<void> {
      const projects = await getProjectBySlug(slug as string);
      setProject(projects);
      setLoading(false);
    }

    if (slug) getAndSetProjects();
  }, [slug]);

  if (!project) return null;

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
          src={
            project.image
              ? urlFor(project.image).width(1920).url()
              : "https://via.placeholder.com/1920x1080"
          }
          alt={project.title}
          className="w-full rounded mb-8"
        />
        <p className="text-lg leading-relaxed mb-8 text-foreground">
          {project.description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {project.github_repo && (
            <Button asChild className="min-w-[200px]">
              <a
                href={project.github_repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Source Code
              </a>
            </Button>
          )}
          
          <Button asChild className="min-w-[200px]">
            <a
              href={project.live_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Live Site
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectDetails;
