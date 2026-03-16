/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['supabase.co', 'your-cdn.com'],
  },
  // Enable static export if needed (optional for Vercel)
  // output: 'export',
}

module.exports = nextConfig
