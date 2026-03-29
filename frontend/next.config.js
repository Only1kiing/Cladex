/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'output: export' for Vercel — it runs Next.js natively
  // For static hosting (Namecheap), uncomment the line below:
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
