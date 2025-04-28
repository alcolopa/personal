import ThemeToggleButton from '@/components/common/ThemeToggleButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu';
import { Github, Linkedin, Twitter } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const updateTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        updateTheme(); // call once on load

        // Optional: listen to class changes if needed
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    const lightLogo = "https://placehold.co/40/000000/FFFFFF?text=EM";
    const darkLogo = "https://placehold.co/40/FFFFFF/000000?text=EM";
    return (
        <>
            {/* Header */}
            <header className="fixed top-0 left-0 w-full bg-white text-black dark:bg-black dark:text-white z-50 shadow">
                <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
                    {/* Left: Logo + Name */}
                    <a href="/" className="flex items-center">
                        <Avatar>
                            <AvatarImage
                                src={isDark ? darkLogo : lightLogo}
                                alt="Emilio"
                            />
                            <AvatarFallback>EM</AvatarFallback>
                        </Avatar>
                        <span className="ml-2 text-lg font-semibold">Emilio El Murr</span>
                    </a>

                    {/* Center: Navigation */}
                    <nav className="flex items-center gap-6">
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

                        {/* Right: Theme Toggle Button */}
                        <ThemeToggleButton />
                    </nav>
                </div>
            </header>

            {/* Main content */}
            <main className="mt-16">
                {children}
            </main>

            {/* Footer */}
            <footer className="py-8 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-center">
                <div className="flex justify-center items-center gap-6 mb-4">
                    <a href="https://github.com/your-profile" aria-label="GitHub">
                        <Github className="w-6 h-6 hover:opacity-80 transition" />
                    </a>
                    <a href="https://linkedin.com/in/your-profile" aria-label="LinkedIn">
                        <Linkedin className="w-6 h-6 hover:opacity-80 transition" />
                    </a>
                    <a href="https://twitter.com/your-profile" aria-label="Twitter">
                        <Twitter className="w-6 h-6 hover:opacity-80 transition" />
                    </a>
                </div>
                <p className="text-sm">© {new Date().getFullYear()} Emilio El Murr. All rights reserved.</p>
            </footer>
        </>
    );
};

export default Layout;
