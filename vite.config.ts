import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base を相対パスにして GitHub Pages などのサブパスでもそのまま動くようにする
// index.html（学科◯×ドリル）と game/index.html（ぜんぶ自動化）の 2 ページをビルドする
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        game: 'game/index.html',
      },
    },
  },
});
