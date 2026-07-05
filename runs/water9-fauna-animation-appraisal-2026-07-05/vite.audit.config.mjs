import { defineConfig } from 'vite';

export default defineConfig({
  root: '/mnt/nxt-dev/water9',
  server: {
    watch: {
      ignored: ['**/.desktop-build/**'],
    },
  },
});
