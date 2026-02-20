// vite.config.js
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, './src/index.js'),
      name: 'EZSearchV2',
      formats: ['umd'],
      fileName: format => (format === 'umd' ? `ezsearch-v2.js` : `ezsearch.${format}.js`),
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      output: {
        // Since we publish our ./src folder, there's no point
        // in bloating sourcemaps with another copy of it.
        sourcemapExcludeSources: true,
      },
    },
    sourcemap: false,
    // Reduce bloat from legacy polyfills.
    target: 'es2020',
    // Leave minification up to applications.
    minify: false,
  },
})
