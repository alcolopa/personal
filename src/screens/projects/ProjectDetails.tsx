import urlFor from '@/cms/urlBuilder';
import { Button } from '@/components/ui/button';
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

const ProjectDetails: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const project = location.state?.project;

  useEffect(() => {
    if (!project) {
      navigate('/projects');
    }
  }, [project, navigate]);

  if (!project) return null;


  return (
    <section className="min-h-screen px-6 py-16 bg-gradient-to-b from-background to-muted text-foreground">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{project.title}</h1>
        <img
          src={urlFor(project.image).width(800).url()}
          alt={project.title}
          className="w-full rounded mb-8"
        />
        <p className="text-lg leading-relaxed mb-8">{project.description}</p>

        <Button asChild>
          <a
            href={project.github_repo}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Source Code
          </a>
        </Button>
      </div>
    </section>
  );
};

export default ProjectDetails;
