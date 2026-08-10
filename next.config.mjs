/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // The embed is the only page allowed to be framed, and only by us.
        // frame-ancestors (not X-Frame-Options) because we need an allowlist,
        // not a boolean.
        source: '/embed',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://audiomediagrading.com https://www.audiomediagrading.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
