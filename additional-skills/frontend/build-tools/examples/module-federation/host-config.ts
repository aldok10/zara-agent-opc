// Host application Module Federation 2.0 config with Vite
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { ModuleFederationPlugin } from '@module-federation/enhanced/vite';

export default defineConfig({
  plugins: [
    react(),
    ModuleFederationPlugin({
      name: 'host',
      remotes: {
        // Manifest-based remotes (recommended for production)
        // URL resolved at runtime via manifest
        dashboard: {
          type: 'module',
          name: 'dashboard',
          entry: process.env.DASHBOARD_REMOTE_URL || 'http://localhost:3001/mf-manifest.json',
        },
        checkout: {
          type: 'module',
          name: 'checkout',
          entry: process.env.CHECKOUT_REMOTE_URL || 'http://localhost:3002/mf-manifest.json',
        },
      },
      shared: {
        // Singleton: only one instance across all remotes
        react: {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.0.0',
          eager: false,
        },
        // Shared state must be singleton to share cache
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.0.0',
          eager: false,
        },
        // Router must be singleton for shared navigation
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^7.0.0',
          eager: false,
        },
        // UI library shared but not singleton (version flexibility)
        '@repo/ui': {
          singleton: false,
          requiredVersion: '*',
        },
      },
    }),
  ],

  server: {
    port: 3000,
    // CORS for remote loading in dev
    cors: true,
  },

  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Consistent chunk naming for caching
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});

// --- Usage in host app ---
// src/App.tsx:
//
// import { lazy, Suspense } from 'react';
// import { ErrorBoundary } from 'react-error-boundary';
//
// const DashboardWidget = lazy(() => import('dashboard/Widget'));
// const CheckoutFlow = lazy(() => import('checkout/Flow'));
//
// function App() {
//   return (
//     <ErrorBoundary fallback={<div>Remote unavailable</div>}>
//       <Suspense fallback={<Skeleton />}>
//         <DashboardWidget />
//       </Suspense>
//     </ErrorBoundary>
//   );
// }
