import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      ],
    }];
  },
  turbopack: {
    // Human ships a Node and a browser bundle. The biometric routes run only
    // in the browser, so force Turbopack to select the browser ESM bundle.
    resolveAlias: {
      "@vladmandic/human": "./node_modules/@vladmandic/human/dist/human.esm.js",
    },
  },
};

export default nextConfig;
