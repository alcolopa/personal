import React from 'react';
import './App.css';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';

const App: React.FC = () => {
  return (
    <>
      <header className="fixed top-0 left-0 w-full dark:bg-black dark:text-white z-50 shadow">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
          <a href="/" className="flex items-center">
            <Avatar>
              <AvatarImage
                src="https://placehold.co/40/000000/FFFFFF?text=EM"
                alt="Emilio"
              />
              <AvatarFallback>EM</AvatarFallback>
            </Avatar>
            <span className="ml-2 text-lg font-semibold">Emilio EL Murr</span>
          </a>

          <nav>
            <NavigationMenu>
              <NavigationMenuList className="flex gap-6 text-sm font-medium">
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/projects" className="hover:underline transition-colors">
                      Projects
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/about" className="hover:underline transition-colors">
                      About
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <a href="/contact" className="hover:underline transition-colors">
                      Contact
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-svh pt-20">
        {/* Your main content here */}
      </main>
    </>
  );
};

export default App;
