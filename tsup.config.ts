import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      react: 'src/react.ts'
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    onSuccess: async () => {
      const source = resolve('src/styles/flipboard.css');
      const target = resolve('dist/styles.css');
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
    }
  }
]);
