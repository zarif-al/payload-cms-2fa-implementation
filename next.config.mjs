import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your Next.js config here
  redirects: async () => {
    return [
      // Redirect from payloads default login to our custom login path
      {
        source: '/admin/deprecated-login',
        destination: '/admin/login',
        permanent: true,
      },
    ]
  },
}

export default withPayload(nextConfig)
