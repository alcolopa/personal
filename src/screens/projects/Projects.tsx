import { getProjects } from '@/cms/sanityClient';
import urlFor from '@/cms/urlBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Project } from '@/types/Project';
import React, { useEffect } from 'react';
import { Link } from 'react-router';

const Projects: React.FC = () => {

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {
    async function getAndSetProjects(): Promise<void> {
      const projects = await getProjects();
      setProjects(projects);
      setLoading(false);
    }

    getAndSetProjects();
  }, []);

  return (
    <section className="min-h-screen px-6 py-16 bg-gradient-to-b from-background to-muted text-foreground">
      <div className="max-w-screen-lg mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">My Projects</h1>
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
        ) : null
        }

        {projects.length === 0 ? (
          <div className="text-center text-muted-foreground">
            <p className="text-xl">No projects to show yet.</p>
            <p className="text-sm mt-2">Stay tuned — more work is on the way!</p>
          </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {projects.map((project, index) => (
                <Card key={index} className="flex flex-col">
                  <CardHeader>
                    <h2 className="text-2xl font-semibold">{project.title}</h2>
                  </CardHeader>
                  <CardContent>
                    {project.image ? (<img
                      src={urlFor(project.image).width(1920).url()}
                      alt={project.title}
                      className="w-full h-48 object-cover rounded mb-4"
                    />) : (<img
                      src="https://placehold.co/600x300"
                      alt={project.title}
                      className="w-full h-48 object-cover rounded mb-4"
                    />)}

                    <p className="text-foreground">{project.description}</p>
                  </CardContent>
                  <CardFooter className="flex justify-between mt-auto">
                    <Link to={`/projects/${project.id}`} state={{ project }}>
                      <Button>Details</Button>
                    </Link>
                    <Button variant="secondary" asChild>
                      <a
                        href={project.github_repo}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
        )}
      </div>
    </section>
  );

};

export default Projects;
