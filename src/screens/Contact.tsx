import { Button } from '@/components/ui/button';
import React from 'react';

const Contact: React.FC = () => {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gray-50 dark:bg-gray-900 dark:text-white">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Get In Touch</h1>
        <p className="text-lg leading-relaxed mb-8">
          Interested in working together or have a project in mind?  
          I’d love to hear from you. Fill out the form below or connect with me directly!
        </p>

        {/* Contact Form */}
        <form className="space-y-6">
          <div className="flex flex-col text-left">
            <label htmlFor="name" className="mb-2 text-sm font-medium">Name</label>
            <input
              type="text"
              id="name"
              className="px-4 py-2 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="email" className="mb-2 text-sm font-medium">Email</label>
            <input
              type="email"
              id="email"
              className="px-4 py-2 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="message" className="mb-2 text-sm font-medium">Message</label>
            <textarea
              id="message"
              rows={5}
              className="px-4 py-2 rounded border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your message..."
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Send Message
          </Button>
        </form>

        {/* Alternative Contact Info */}
        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>or email me directly: <a href="mailto:youremail@example.com" className="text-blue-600 dark:text-blue-400 underline">youremail@example.com</a></p>
        </div>
      </div>
    </section>
  );
};

export default Contact;
