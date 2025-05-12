import ThemeToggleButton from '@/components/common/ThemeToggleButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Github, Linkedin, Menu, Twitter, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDark, setIsDark] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const update = () =>
            setIsDark(document.documentElement.classList.contains('dark'));
        update();

      const obs = new MutationObserver(update);
      obs.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
      });
      return () => obs.disconnect();
  }, []);

    const lightLogo = 'https://placehold.co/40/000000/FFFFFF?text=EM';
    const darkLogo = 'https://placehold.co/40/FFFFFF/000000?text=EM';

    const links = (
        <>
            <a href="/projects" className="hover:underline transition-colors">
                Projects
            </a>
            <a href="/about" className="hover:underline transition-colors">
                About
            </a>
            <a href="/contact" className="hover:underline transition-colors">
                Contact
            </a>
            <a href="/blog" className="hover:underline transition-colors">
                Blog
            </a>
        </>
    );

    return (
        <>
          <header className="fixed top-0 left-0 w-full bg-background text-foreground z-50 shadow">
              <div className="max-w-screen-xl mx-auto flex items-center justify-between h-16 px-4">
                  <a href="/" className="flex items-center">
                      <Avatar>
                          <AvatarImage src={isDark ? darkLogo : lightLogo} alt="EM" />
                          <AvatarFallback>EM</AvatarFallback>
                      </Avatar>
                      <span className="ml-2 text-lg font-semibold hidden sm:inline">
                          Emilio El Murr
                      </span>
                  </a>

                  <nav className="hidden sm:flex items-center gap-6">
                      {links}
                      <ThemeToggleButton />
                  </nav>

                  <button
                      className="sm:hidden p-2"
                      onClick={() => setMobileOpen((v) => !v)}
                      aria-label="Toggle menu"
                  >
                      {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </button>
              </div>

              {mobileOpen && (
                  <div className="sm:hidden bg-background px-4 pb-4">
                      <nav className="flex flex-col items-center space-y-4">
                          {links}
                          <ThemeToggleButton />
                      </nav>
                  </div>
              )}
          </header>

          <main className="mt-16">{children}</main>

          <footer className="py-8 bg-muted text-muted-foreground text-center">
              <div className="flex justify-center items-center gap-6 mb-4">
                  <a href="https://github.com/alcolopa" aria-label="GitHub">
                      <Github className="w-6 h-6 hover:opacity-80 transition" />
                  </a>
                  <a href="https://linkedin.com/in/emilioelmurr" aria-label="LinkedIn">
                      <Linkedin className="w-6 h-6 hover:opacity-80 transition" />
                  </a>
                  <a href="https://x.com/emilioelmurr_" aria-label="Twitter">
                      <Twitter className="w-6 h-6 hover:opacity-80 transition" />
                  </a>
              </div>
              <p className="text-sm">
                  © {new Date().getFullYear()} Emilio El Murr. All rights reserved.
              </p>
          </footer>
      </>
  );
};

export default Layout;
