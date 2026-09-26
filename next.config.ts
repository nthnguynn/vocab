import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cho phép tải file CSV tới 2MB ở trang Nhập (cộng phần dư của multipart)
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
