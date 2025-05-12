export type Project = {
    id: string;
    title: string;
    description?: string;
    image?: string;
    github_repo?: string;
    live_link?: string;
};

export const mapProjectToDTO = (project: Project) => ({
    id: project.id,
    title: project.title,
    description: project.description || null,
    image: project.image || null,
    github_repo: project.github_repo || null,
    live_link: project.live_link || null,
});

export const mapDTOToProject = (dto: ReturnType<typeof mapProjectToDTO>): Project => ({
    id: dto.id,
    title: dto.title,
    description: dto.description || undefined,
    image: dto.image || undefined,
    github_repo: dto.github_repo || undefined,
    live_link: dto.live_link || undefined,
});