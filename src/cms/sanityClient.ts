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

export async function getProjectBySlug(id: string) {
  const query = `*[_type == "project" && id == id][0]`;
  const params = { id };
  return await client.fetch(query, params);
}

export async function getBlogs() {
  const projects = await client.fetch('*[_type == "blog"]')
  return projects
}

export async function getBlogBySlug(slug: string) {
  const query = `*[_type == "blog" && slug == slug][0]`;
  const params = { slug };
  return await client.fetch(query, params);
}

