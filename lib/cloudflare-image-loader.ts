// lib/cloudflare-image-loader.ts
// Custom image loader for Cloudflare Image Optimization
// https://developers.cloudflare.com/images/transform-images/transform-via-url/

export default function cloudflareLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // Get the domain from environment variable or use a default
  const domain = process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || '';

  // If src is already a full URL (external image), return as-is or handle differently
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // For external images, you may want to proxy them through Cloudflare
    // or return them as-is depending on your setup
    return src;
  }

  // Ensure src starts with /
  const normalizedSrc = src.startsWith('/') ? src : `/${src}`;

  // Cloudflare Image Optimization URL format:
  // https://yourdomain.com/cdn-cgi/image/<options>/<image-path>

  // Build the options string
  const params = [];

  // Width
  if (width) {
    params.push(`width=${width}`);
  }

  // Quality (default 85 if not specified)
  const imageQuality = quality || 85;
  params.push(`quality=${imageQuality}`);

  // Format auto (automatically serves WebP/AVIF based on browser support)
  params.push('format=auto');

  // Fit cover (crops to exact dimensions)
  params.push('fit=cover');

  // Optimize for web (applies additional compression)
  params.push('onerror=redirect');

  const optionsString = params.join(',');

  // For local development, return the original path
  if (process.env.NODE_ENV === 'development') {
    return normalizedSrc;
  }

  // In production, use Cloudflare's image transformation
  // Remove protocol from domain if present
  const cleanDomain = domain.replace(/^https?:\/\//, '');

  return `https://${cleanDomain}/cdn-cgi/image/${optionsString}${normalizedSrc}`;
}
