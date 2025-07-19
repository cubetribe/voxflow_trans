import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { ToastProvider } from '@/components/common/ToastProvider';
import { DebugPanel } from '@/components/common/DebugPanel';
import { SystemStatusPanel } from '@/components/system/SystemStatusPanel';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/Home';
import '@/styles/globals.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="voxflow-theme">
        <ToastProvider>
          <MainLayout>
            <HomePage />
          </MainLayout>
          <SystemStatusPanel />
          <DebugPanel />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
