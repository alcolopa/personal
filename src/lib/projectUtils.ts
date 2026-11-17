import urlFor from '@/cms/urlBuilder';

export function getProjectImageUrl(image?: any): string | null {
  if (!image) return null;
  if (typeof image === 'string') {
    return image;
  }
  try {
    return urlFor(image).width(1200).url();
  } catch (err) {
    console.warn('Failed to resolve Sanity image asset:', err);
    return null;
  }
}
