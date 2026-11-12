import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function createBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.CF_PAGES_COMMIT_SHA
    || process.env.GITHUB_SHA
    || Date.now().toString(36)
  );
}

function deployVersionPlugin(buildId: string): Plugin {
  return {
    name: 'nexlogs-deploy-version',
    transformIndexHtml(html) {
      if (html.includes('name="nexlogs-build"')) return html;
      return html.replace(
        /<head>/i,
        `<head>\n    <meta name="nexlogs-build" content="${buildId}" />`,
      );
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || path.resolve(__dirname, 'dist');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        `${JSON.stringify({ buildId }, null, 2)}\n`,
        'utf8',
      );
    },
  };
}

const buildId = createBuildId();

export default defineConfig({
  plugins: [react(), tailwindcss(), deployVersionPlugin(buildId)],
  envDir: path.resolve(__dirname, '..'),
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
            return 'vendor-react';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
          if (id.includes('lucide-react') || id.includes('sonner') || id.includes('@radix-ui')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
