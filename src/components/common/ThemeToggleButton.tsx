import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeToggleButton: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', isDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleClick = () => {
    const nextTheme: Theme =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';

    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
  };

  const icon = {
    light: <Sun className="w-6 h-6" />,
    dark: <Moon className="w-6 h-6" />,
    system: <Monitor className="w-6 h-6" />,
  };

  return (
    <button
      onClick={handleClick}
      className="relative w-10 h-10 rounded-full flex items-center justify-center border hover:scale-110 transition-transform"
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
          {icon[theme]}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

export default ThemeToggleButton;
