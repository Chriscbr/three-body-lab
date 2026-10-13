import {defineConfig} from 'vite';

export default defineConfig({
  // Keep root-hosted builds and local development working alongside Pages.
  base: process.env.VITE_BASE_PATH ?? '/',
});
