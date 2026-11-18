import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The Fandi Admin pages moved out of the idol dashboard into /admin.
  async redirects() {
    return [
      { source: "/dashboard/admin/withdrawals", destination: "/admin/withdrawals", permanent: false },
      { source: "/dashboard/admin/classification", destination: "/admin/classification", permanent: false },
      { source: "/dashboard/admin", destination: "/admin", permanent: false },
      { source: "/dashboard/admin/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'",
          },
        ],
      },
      // These routes can carry invitation bearer tokens. Keep the stricter
      // rule after the baseline so no token is sent in a Referer header.
      ...["/dashboard/collaborations", "/login", "/invite/accept", "/invitacion", "/reset-password"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
};

export default withNextIntl(nextConfig);
