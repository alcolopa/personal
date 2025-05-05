import '@/App.css';
import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router';
import Layout from './layouts/Main';
import { initGA, logPageView } from './lib/ga';
import About from './screens/About';
import Contact from './screens/Contact';
import Home from './screens/Home';
import NotFound from './screens/NotFound';
import ProjectDetails from './screens/projects/ProjectDetails';
import Projects from './screens/projects/Projects';


const AppContent: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    logPageView(location.pathname + location.search);
  }, [location]);

  return (
    <Routes>
      <Route path="*" element={<NotFound />} />

      <Route
        path="/"
        element={
          <Layout>
            <Home />
          </Layout>
        }
      />
      <Route
        path="/about"
        element={
          <Layout>
            <About />
          </Layout>
        }
      />
      <Route
        path="/contact"
        element={
          <Layout>
            <Contact />
          </Layout>
        }
      />
      <Route
        path="/projects"
        element={
          <Layout>
            <Projects />
          </Layout>
        }
      />
      <Route
        path="/project-details"
        element={
          <Layout>
            <ProjectDetails />
          </Layout>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;
