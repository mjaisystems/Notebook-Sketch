import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // This would normally be imported, but for this environment we assume standard setup. 
// Note: In the provided environment, plugins might need specific handling, 
// but basic define is the key requirement.

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  server: {
    host: '0.0.0.0',
  }
});