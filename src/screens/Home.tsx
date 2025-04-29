import '@/App.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ChevronDown, ClipboardList, Code, Rocket } from 'lucide-react';
import React from 'react';

const Home: React.FC = () => {
  return (
    <main>
      <section
        id="hero"
        className="
          relative
          flex items-center
          bg-gray-300
          dark:bg-gray-800
          text-black
          dark:text-white
          px-6
          pt-16 pb-8
          min-h-[75vh] md:min-h-[90vh]
        "
      >
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: headline, stats, buttons */}
          <div className="space-y-6 text-center md:text-left">
            <h1 className="text-5xl font-extrabold leading-tight">
              Emilio El Murr<br />
              Back-End Engineer
            </h1>
            <p className="text-lg max-w-md mx-auto md:mx-0">
              Building high-performance Laravel applications that delight users and drive results.
            </p>

            {/* Stats */}
            <div className="flex justify-center md:justify-start gap-6">
              <div className="flex flex-col items-center">
                <ClipboardList className="w-8 h-8 mb-1" />
                <span className="font-medium">5+ Years</span>
              </div>
              <div className="flex flex-col items-center">
                <Code className="w-8 h-8 mb-1" />
                <span className="font-medium">15+ Projects</span>
              </div>
              <div className="flex flex-col items-center">
                <Rocket className="w-8 h-8 mb-1" />
                <span className="font-medium">Remote-Ready</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4 pt-4">
              <Button asChild>
                <a href="#projects">View My Work</a>
              </Button>
              <Button variant="secondary" asChild>
                <a href="/contact">Contact Me</a>
              </Button>
            </div>
          </div>

          {/* Right: illustration */}
          <div className="hidden md:flex justify-center">
            <img
              src="/assets/hero-image.webp"
              alt="Developer at work illustration"
              className="w-90 h-auto"
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hidden md:flex absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <ChevronDown className="w-6 h-6 text-white animate-bounce" />
        </div>
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

      <section className="py-12 px-4 bg-gray-300 dark:bg-gray-800">
        <div className="max-w-screen-lg mx-auto">
          <h3 className="text-2xl font-semibold mb-6 text-center">Tech & Skills</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Git', 'Docker', 'CI/CD', 'Laravel', 'Postgresql', 'MySQL', 'MongoDB'].map(
              (tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-gray-400 dark:bg-gray-700 rounded-full text-sm"
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

      <section className="py-16 px-4 bg-gray-300 dark:bg-gray-900 dark:text-white">
        <div className="max-w-screen-md mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-8">What People Say</h3>
          <blockquote className="italic border-l-4 pl-4">
            "Emilio delivered our project on time and exceeded expectations. His attention to detail
            and communication made the remote collaboration seamless."
          </blockquote>
          <p className="mt-4 font-medium">— Jane Doe, CTO at TechCorp</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-screen-lg mx-auto px-6">
          <h3 className="text-4xl font-bold text-center mb-16">My Process</h3>
          <ul className="flex flex-col md:flex-row items-center justify-between gap-12">
            <li className="flex flex-col items-center text-center max-w-xs">
              <ClipboardList className="w-12 h-12 mb-6 text-black" />
              <h4 className="text-xl font-semibold mb-2">Plan</h4>
              <p className="text-base text-gray-600">Discovery &amp; requirement gathering</p>
            </li>
            <li className="flex flex-col items-center text-center max-w-xs">
              <Code className="w-12 h-12 mb-6 text-black" />
              <h4 className="text-xl font-semibold mb-2">Build</h4>
              <p className="text-base text-gray-600">Development &amp; iteration</p>
            </li>
            <li className="flex flex-col items-center text-center max-w-xs">
              <Rocket className="w-12 h-12 mb-6 text-black" />
              <h4 className="text-xl font-semibold mb-2">Launch</h4>
              <p className="text-base text-gray-600">Deployment &amp; support</p>
            </li>
          </ul>
        </div>
      </section>



      {/* Call to Action */}
      <section id="contact" className="py-16 px-4 bg-gray-300 dark:bg-gray-800 dark:text-white text-center">
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
