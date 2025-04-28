import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import React from 'react';

const projects = [
  {
    title: 'E-commerce Platform',
    description:
      'A scalable e-commerce platform that boosted checkout conversion by 25% through optimized UX and backend performance tuning.',
    imageUrl: 'https://placehold.co/600x300',
    detailsLink: '/projects/ecommerce',
    sourceLink: 'https://github.com/your-repo-ecommerce',
  },
  {
    title: 'Analytics Dashboard',
    description:
      'Real-time analytics dashboard enabling stakeholders to visualize KPIs and business metrics with custom reporting tools.',
    imageUrl: 'https://placehold.co/600x300',
    detailsLink: '/projects/dashboard',
    sourceLink: 'https://github.com/your-repo-dashboard',
  },
  {
    title: 'SaaS Authentication System',
    description:
      'Built a robust authentication system for a SaaS platform with OAuth, JWT, and multi-tenant support.',
    imageUrl: 'https://placehold.co/600x300',
    detailsLink: '/projects/saas-auth',
    sourceLink: 'https://github.com/your-repo-auth',
  },
];

const Projects: React.FC = () => {
  return (
    <section className="min-h-screen px-6 py-16 bg-gray-50 dark:bg-gray-900 dark:text-white">
      <div className="max-w-screen-lg mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">My Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <h2 className="text-2xl font-semibold">{project.title}</h2>
              </CardHeader>
              <CardContent>
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-48 object-cover rounded mb-4"
                />
                <p className="text-gray-700 dark:text-gray-300">{project.description}</p>
              </CardContent>
              <CardFooter className="flex justify-between mt-auto">
                <Button asChild>
                  <a href={project.detailsLink}>Details</a>
                </Button>
                <Button variant="secondary" asChild>
                  <a href={project.sourceLink} target="_blank" rel="noopener noreferrer">
                    Source
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Projects;
