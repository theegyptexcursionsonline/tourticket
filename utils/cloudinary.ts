// utils/cloudinary.ts
export const getOptimizedImageUrl = (
  imageUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: string;
    format?: string;
    crop?: string;
  } = {}
) => {
  const {
    width = 400,
    height = 400,
    quality = 'auto',
    format = 'auto',
    crop = 'fill'
  } = options;

  // If it's already a Cloudinary URL, add transformations
  if (imageUrl?.includes('res.cloudinary.com')) {
    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length === 2) {
      const transforms = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
      return `${urlParts[0]}/upload/${transforms}/${urlParts[1]}`;
    }
  }
  
  // For non-Cloudinary URLs, return as is
  return imageUrl;
};

export const generateBlurDataURL = (width: number = 8, height: number = 8): string => {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f1f5f9"/>
    </svg>`
  ).toString('base64')}`;
};

// Preload critical images
export const preloadImage = (src: string): void => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
};