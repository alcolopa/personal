import React from 'react';
import { Link } from 'react-router';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6gradient-to-b from-background to-muted text-foreground">
      <h1 className="text-5xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-lg mb-6">
        It seems like you're lost in the code jungle. Let's get you back home.
      </p>
      <Link
        to="/"
        className="px-6 py-3 rounded-lg bg-secondary text-foreground hover:bg-primary transition-colors duration-300"
      >
        Go to Homepage
      </Link>
    </div>
  );
};

export default NotFound;
