// src/pages/About.tsx
import React from 'react';

const About: React.FC = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-white dark:bg-black dark:text-white">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">About Me</h1>
        <p className="text-lg leading-relaxed mb-6">
          I’m a backend engineer with <strong>4+ years of experience</strong> in building scalable,
          secure, and high-performance server-side applications.
          I specialize in <span className="text-blue-600 dark:text-blue-400">Laravel, Node.js</span>, and
          cloud deployments, crafting solutions that power seamless user experiences.
        </p>
        <p className="text-md text-gray-600 dark:text-gray-400 leading-relaxed">
          Passionate about writing clean and maintainable code, I thrive in collaborative remote teams,
          continuously learning and contributing to open-source projects.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <p>📍 Based in Beirut (UTC+3)</p>
          <p>🚀 15+ projects shipped</p>
          <p>💬 Open for remote collaboration</p>
        </div>
      </div>
    </section>
  );
};

export default About;
