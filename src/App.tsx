import '@/App.css';
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { useSystemTheme } from './hooks/useSystemTheme';
import Layout from './layouts/Main';
import About from './screens/About';
import Contact from './screens/Contact';
import Home from './screens/Home';
import ProjectDetails from './screens/projects/ProjectDetails';
import Projects from './screens/projects/Projects';

const App: React.FC = () => {
  useSystemTheme();

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/projects">
            <Route index element={<Projects />} />
            <Route path=":projectId" element={<ProjectDetails />} />
          </Route>
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
