import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // On Vercel only (needs SENTRY_AUTH_TOKEN): sends Sentry the readable error details
    // and the release's commits, then removes the map files so they are never public.
    process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: 'ayanfe-dev',
        project: 'javascript-react',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        telemetry: false,
        release: {
          name: process.env.VERCEL_GIT_COMMIT_SHA,
          setCommits: {
            repo: 'AyanfeWaves18/Campusly',
            commit: process.env.VERCEL_GIT_COMMIT_SHA,
            ignoreMissing: true,
            ignoreEmpty: true,
          },
        },
        sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        // A Sentry problem must never stop your site from deploying
        errorHandler: (err) => console.warn('Sentry upload skipped:', err.message),
      }),
  ],
  build: { sourcemap: true },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})