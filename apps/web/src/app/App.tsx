import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.js";
import "./global.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5_000 } }
});

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6", // Premium Tech Blue
          colorSuccess: "#10b981", // Emerald Green
          colorWarning: "#f59e0b", // Amber Orange
          colorError: "#ef4444",   // Coral Red
          colorInfo: "#06b6d4",    // Cyber Cyan
          borderRadius: 10,
          fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          colorBgBase: "#070a13",  // Deep Space Dark Background
          colorBgContainer: "#0f1422", // Sleek Card/Container Fill
          colorBorder: "#1e293b",
        },
        components: {
          Card: {
            colorBgContainer: "#0f1422",
            colorBorderSecondary: "#1e293b",
          },
          Table: {
            colorBgContainer: "#0f1422",
            headerBg: "#161d30",
          },
          Layout: {
            colorBgHeader: "#0a0d18",
            colorBgBody: "#070a13",
          }
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  );
}

