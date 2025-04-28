// src/pages/ProjectDetails.tsx
import { Button } from '@/components/ui/button';
import React from 'react';
import { useParams } from 'react-router';

const projectData = {
  ecommerce: {
    title: 'E-commerce Platform',
    description:
      'A full-featured e-commerce platform with optimized checkout flow, integrated payment gateways, and admin dashboard.',
    imageUrl: 'https://placehold.co/800x400',
    technologies: ['Laravel', 'React', 'Stripe', 'Docker'],
    sourceLink: 'https://github.com/your-repo-ecommerce',
  },
  dashboard: {
    title: 'Analytics Dashboard',
    description:
      'Interactive dashboard for real-time business analytics, user metrics, and reporting. Built with focus on performance and scalability.',
    imageUrl: 'https://placehold.co/800x400',
    technologies: ['React', 'TypeScript', 'Node.js', 'D3.js'],
    sourceLink: 'https://github.com/your-repo-dashboard',
  },
  'saas-auth': {
    title: 'SaaS Authentication System',
    description:
      'Multi-tenant authentication system supporting OAuth, JWT, passwordless login, and SSO for enterprise users.',
    imageUrl: 'https://placehold.co/800x400',
    technologies: ['Laravel', 'OAuth2', 'JWT', 'MySQL'],
    sourceLink: 'https://github.com/your-repo-auth',
  },
};

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const project = projectData[projectId as keyof typeof projectData];

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Project Not Found</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Sorry, we couldn't find the project you're looking for.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-screen px-6 py-16 bg-white dark:bg-black dark:text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{project.title}</h1>
        <img
          src={project.imageUrl}
          alt={project.title}
          className="w-full rounded mb-8"
        />
        <p className="text-lg leading-relaxed mb-8">{project.description}</p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Technologies Used</h2>
          <div className="flex flex-wrap gap-3">
            {project.technologies.map((tech, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <Button asChild>
          <a href={project.sourceLink} target="_blank" rel="noopener noreferrer">
            View Source Code
          </a>
        </Button>
      </div>
    </section>
  );
};

export default ProjectDetails;
