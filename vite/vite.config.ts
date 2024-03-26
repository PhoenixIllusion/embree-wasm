import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        format: 'esm'
      }
    },
    target: ['esnext']
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        'top-level-await': true
      }
    }
  },
  worker: {
    format: 'es'
  },
  base: './',
  server: {
    host: 'localhost',
    port: 8080
  },
  plugins: [
    {
      name: "isolation",
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
})