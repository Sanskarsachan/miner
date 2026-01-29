/** @type {import('next').NextConfig} */
const path = require('path')

module.exports = {
  reactStrictMode: true,
  compress: true,
  // Vercel deployment settings
  output: 'standalone',
  // Fix for multiple lockfiles warning
  outputFileTracingRoot: path.join(__dirname, './'),
  typescript: {
    tsconfigPath: './tsconfig.json'
  }
};
