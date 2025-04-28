// components/common/ThemeToggleButton.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeToggleButton: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // no saved value → respect OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // keep <html> in sync
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleClick = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  const icons = {
    light: <Sun className="w-6 h-6" />,
    dark: <Moon className="w-6 h-6" />,
  };

  return (
    <button
      onClick={handleClick}
      className="relative w-10 h-10 rounded-full flex items-center justify-center border hover:scale-110 transition-transform"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: 0.3 }}
          className="absolute"
        >
          {icons[theme]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggleButton;
