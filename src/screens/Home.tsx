import '@/App.css';
import { getFeaturedProjects } from '@/cms/sanityClient';
import urlFor from '@/cms/urlBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Project } from '@/types/Project';
import { ChevronDown, ClipboardList, Code, Rocket } from 'lucide-react';
import React, { useEffect } from 'react';
import { Link } from 'react-router';

const Home: React.FC = () => {

  const [projects, setProjects] = React.useState<Array<Project>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  useEffect(() => {

    async function getAndSetProjects(): Promise<void> {
      const projects = await getFeaturedProjects();
      setProjects(projects);
      setLoading(false);
    }

    getAndSetProjects();
  }, []);

  return (
    <main>
      <section
        id="hero"
        className="
          relative
          flex items-center
          bg-gradient-to-b 
          from-muted to-background
          text-foreground
          px-6
          pt-16 pb-8
          min-h-[75vh] md:min-h-[93vh]
        "
      >
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-5xl font-extrabold leading-tight">
              Emilio El Murr<br />
              Back-End Engineer
            </h1>
            <p className="text-lg max-w-md mx-auto md:mx-0">
              Building high-performance Laravel applications that delight users and drive results.
            </p>

            <div className="flex justify-center md:justify-start gap-6">
              <div className="flex flex-col items-center">
                <ClipboardList className="w-8 h-8 mb-1" />
                <span className="font-medium">4+ Years</span>
              </div>
              <div className="flex flex-col items-center">
                <Code className="w-8 h-8 mb-1" />
                <span className="font-medium">10+ Projects</span>
              </div>
              <div className="flex flex-col items-center">
                <Rocket className="w-8 h-8 mb-1" />
                <span className="font-medium">Remote-Ready</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
              <Button asChild>
                <a href="#projects">View My Work</a>
              </Button>
              <Button variant="secondary" asChild>
                <a href="/contact">Contact Me</a>
              </Button>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            <img
              src="/assets/hero-image.webp"
              alt="Developer at work illustration"
              className="w-90 h-auto"
            />
          </div>
        </div>

        <div className="hidden md:flex absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-foreground animate-bounce" />
        </div>
      </section>

      <section
        id="about"
        className="py-16 px-4 bg-background text-foreground"
      >
        <div className="max-w-screen-md mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">About Me</h2>
          <p className="text-lg mb-2">
            I’m a back-end engineer based in Beirut (UTC+3), specializing in building fast, secure APIs with precise data handling. With over 4 years of experience, I thrive on solving complex technical challenges and collaborating with fully remote teams.
          </p>
          <p className="text-sm text-muted-foreground">
            ◉ 4+ years experience &nbsp;|&nbsp; 10+ projects delivered &nbsp;|&nbsp; Open to remote opportunities
          </p>
        </div>
      </section>

      <section className="py-12 px-4 bg-background text-foreground">
        <div className="max-w-screen-lg mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-center">Tech & Skills</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              'React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Git',
              'Docker', 'CI/CD', 'Laravel', 'Postgresql', 'MySQL', 'MongoDB',
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-accent text-accent-foreground rounded-full text-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="py-16 px-4 bg-background text-foreground">
        <div className="max-w-screen-lg mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Featured Projects</h2>

          <Carousel className="w-full">
            <CarouselContent>
              {projects.map((project, idx) => (
                <CarouselItem key={idx} className="md:basis-full lg:basis-full">
                  <Card>
                    <CardHeader>
                      <h4 className="text-xl font-semibold">{project.title}</h4>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={project.image ? urlFor(project.image).width(1920).url() : 'https://placehold.co/600x300'}
                        alt={project.title}
                        className="w-full rounded mb-4"
                      />
                      <p>{project.description}</p>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Link to="/project-details" state={{ project }}>
                        <Button>Details</Button>
                      </Link>
                      {project.github_repo && (
                        <Button variant="secondary" asChild>
                          <a href={project.github_repo} target="_blank" rel="noopener noreferrer">Source</a>
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            <div className="hidden md:flex justify-center mt-4 gap-4">
              <CarouselPrevious />
              <CarouselNext />
            </div>
          </Carousel>
        </div>
      </section>

      <section className="py-20 bg-background text-foreground">
        <div className="max-w-screen-lg mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-16">My Process</h3>
          <ul className="flex flex-col md:flex-row items-center justify-between gap-12">
            <li className="flex flex-col items-center text-center max-w-xs">
              <ClipboardList className="w-12 h-12 mb-6 text-foreground" />
              <h4 className="text-xl font-semibold mb-2 text-muted-foreground">Plan</h4>
              <p className="text-base text-muted-foreground">Understand needs</p>
            </li>
            <li className="flex flex-col items-center text-center max-w-xs">
              <Code className="w-12 h-12 mb-6 text-foreground" />
              <h4 className="text-xl font-semibold mb-2 text-muted-foreground">Build</h4>
              <p className="text-base text-muted-foreground">Develop & Refine</p>
            </li>
            <li className="flex flex-col items-center text-center max-w-xs">
              <Rocket className="w-12 h-12 mb-6 text-foreground" />
              <h4 className="text-xl font-semibold mb-2 text-muted-foreground">Launch</h4>
              <p className="text-base text-muted-foreground">Deploy & Assist</p>
            </li>
          </ul>
        </div>
      </section>

      <section id="contact" className="py-16 px-4 bg-background text-foreground text-center">
        <h3 className="text-2xl font-semibold mb-4">Ready to collaborate?</h3>
        <p className="mb-6">Let’s turn your ideas into reality—fully remote, transparent process.</p>
        <Button asChild>
          <a href="/contact">Contact Me</a>
        </Button>
      </section>
    </main>
  );
};

export default Home;
