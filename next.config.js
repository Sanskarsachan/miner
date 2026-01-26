/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: '/courseharvester', destination: '/courseharvester.html' },
      { source: '/courseharvester/', destination: '/courseharvester.html' }
    ];
  }
};
