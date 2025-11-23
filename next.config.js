/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // ⚠️ Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/oembed.json',
        destination: '/api/.well-known/oembed',
      },
    ]
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    // Handle WASM modules for XMTP
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Externalize XMTP SDK for client-side only
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@xmtp/browser-sdk': 'commonjs @xmtp/browser-sdk',
        '@xmtp/wasm-bindings': 'commonjs @xmtp/wasm-bindings',
      });
    }
    
    return config;
  },
}

module.exports = nextConfig

