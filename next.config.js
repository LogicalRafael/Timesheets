/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep @react-pdf/renderer in the Node.js layer — it uses native modules
    // that cannot be bundled by the Next.js App Router compiler.
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
}

module.exports = nextConfig
