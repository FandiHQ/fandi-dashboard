import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        // Invitation links land here with ?token=… (a bearer secret): never
        // leak it to another origin through the Referer header.
        source: "/dashboard/collaborations",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // Signed-out invitees pass through /login?next=…?token=… first.
        source: "/login",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
