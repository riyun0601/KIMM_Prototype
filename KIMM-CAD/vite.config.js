import { cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));

/** Preserve the supplied UI and icon assets at /refs in production builds. */
export default defineConfig({
  plugins: [
    {
      name: 'copy-reference-assets',
      apply: 'build',
      async closeBundle() {
        await cp(resolve(projectRoot, 'refs'), resolve(projectRoot, 'dist', 'refs'), {
          recursive: true,
        });
      },
    },
  ],
});
