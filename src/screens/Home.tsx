import '@/App.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ClipboardList, Code, Rocket } from 'lucide-react';
import React from 'react';

const Home: React.FC = () => {
  return (
    <main>
    <section
      id="hero"
      className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50 dark:bg-gray-900"
    >
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
        Emilio El Murr — Back-End Engineer
      </h1>
      <p className="text-lg md:text-xl mb-6 max-w-xl">
        Building high-performance Laravel applications that delight users and drive results.
      </p>
      <Button asChild>
        <a href="#projects">View My Work</a>
      </Button>
    </section>

    <section
      id="about"
      className="py-16 px-4 bg-white dark:bg-black dark:text-white"
    >
      <div className="max-w-screen-md mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">About Me</h2>
        <p className="text-lg mb-2">
          I’m a front-end engineer based in Beirut (UTC+3), specializing in crafting intuitive user
          experiences with React and TypeScript. With over 5 years of experience, I love solving
          complex UI challenges and collaborating in fully remote teams.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ◉ 5+ years experience &nbsp;|&nbsp; 15+ projects shipped &nbsp;|&nbsp; Available for remote
          work
        </p>
      </div>
    </section>

    <section className="py-12 px-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-screen-lg mx-auto">
        <h3 className="text-2xl font-semibold mb-6 text-center">Tech & Skills</h3>
        <div className="flex flex-wrap justify-center gap-3">
          {['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Git', 'Docker', 'CI/CD'].map(
            (tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm"
              >
                {tech}
              </span>
            )
          )}
        </div>
      </div>
    </section>

    <section id="projects" className="py-16 px-4">
      <div className="max-w-screen-lg mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-center">Featured Projects</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h4 className="text-xl font-semibold">E-commerce Platform</h4>
            </CardHeader>
            <CardContent>
              <img
                src="https://placehold.co/600x300"
                alt="E-commerce Project"
                className="w-full rounded mb-4"
              />
              <p>
                Built a scalable e-commerce web app that boosted conversion by 25% by
                optimizing checkout flows and product pages.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button asChild>
                <a href="/projects/ecommerce">Details</a>
              </Button>
              <Button variant="secondary" asChild>
                <a href="https://github.com/your-repo">Source</a>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-xl font-semibold">Dashboard Analytics</h4>
            </CardHeader>
            <CardContent>
              <img
                src="https://placehold.co/600x300"
                alt="Dashboard Analytics"
                className="w-full rounded mb-4"
              />
              <p>
                Developed an interactive analytics dashboard with real-time charts,
                improving data visibility for stakeholders.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button asChild>
                <a href="/projects/dashboard">Details</a>
              </Button>
              <Button variant="secondary" asChild>
                <a href="https://github.com/your-repo">Source</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>

    <section className="py-16 px-4 bg-gray-50 dark:bg-gray-900 dark:text-white">
      <div className="max-w-screen-md mx-auto text-center">
        <h3 className="text-2xl font-semibold mb-8">What People Say</h3>
        <blockquote className="italic border-l-4 pl-4">
          "Emilio delivered our project on time and exceeded expectations. His attention to detail
          and communication made the remote collaboration seamless."
        </blockquote>
        <p className="mt-4 font-medium">— Jane Doe, CTO at TechCorp</p>
      </div>
    </section>

    <section className="py-16">
      <div className="max-w-screen-lg mx-auto">
        <h3 className="text-2xl font-semibold mb-6 text-center">My Process</h3>
        <ul className="flex flex-col md:flex-row justify-around items-start gap-8">
          <li className="flex flex-col items-center text-center">
            <ClipboardList className="w-10 h-10 mb-2" />
            <strong>Plan</strong>
            <p className="mt-2">Discovery &amp; requirement gathering</p>
          </li>
          <li className="flex flex-col items-center text-center">
            <Code className="w-10 h-10 mb-2" />
            <strong>Build</strong>
            <p className="mt-2">Development &amp; iteration</p>
          </li>
          <li className="flex flex-col items-center text-center">
            <Rocket className="w-10 h-10 mb-2" />
            <strong>Launch</strong>
            <p className="mt-2">Deployment &amp; support</p>
          </li>
        </ul>
      </div>
    </section>

    {/* Call to Action */}
    <section id="contact" className="py-16 px-4 bg-blue-600 text-white text-center">
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
