import { Project } from '@/types/Project';
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: 'o2c2iejq',
  dataset: 'production',
  useCdn: true,
  apiVersion: '2024-06-01',
});

export async function getProjects(): Promise<Project[]> {
    const projects = await client.fetch('*[_type == "project"]')
    return projects
  }

export async function getFeaturedProjects(): Promise<Project[]> {
  const featuredProjects = await client.fetch('*[_type == "project" && is_featured == true]')
  return featuredProjects
}
