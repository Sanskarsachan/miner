/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  async rewrites() {
    return [
      { source: '/courseharvester', destination: '/courseharvester.html' },
      { source: '/courseharvester/', destination: '/courseharvester.html' }
    ];
  },
  // Vercel deployment settings
  output: 'standalone',
  typescript: {
    tsconfigPath: './tsconfig.json'
  }
};
