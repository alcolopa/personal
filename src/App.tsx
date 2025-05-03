import '@/App.css';
import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import Layout from './layouts/Main';
import { initGA, logPageView } from './lib/ga';
import About from './screens/About';
import Contact from './screens/Contact';
import Home from './screens/Home';
import ProjectDetails from './screens/projects/ProjectDetails';
import Projects from './screens/projects/Projects';

const App: React.FC = () => {
  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    logPageView(location.pathname + location.search);
  }, [location]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project-details" element={<ProjectDetails />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
