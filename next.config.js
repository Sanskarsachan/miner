/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compress: true,
  // Vercel deployment settings
  output: 'standalone',
  typescript: {
    tsconfigPath: './tsconfig.json'
  }
};
