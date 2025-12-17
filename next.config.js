/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1mb to 10mb for base64 images
    },
  },
};

export default nextConfig;
