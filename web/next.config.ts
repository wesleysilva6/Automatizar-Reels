import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O binário do ffmpeg não pode ser empacotado pelo bundler; precisa
  // continuar em node_modules e ser levado junto no deploy.
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/parte": ["./node_modules/ffmpeg-static/ffmpeg*"],
  },
};

export default nextConfig;
