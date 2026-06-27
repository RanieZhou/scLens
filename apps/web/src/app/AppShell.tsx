import { Layout, Menu, Typography } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { key: "/", label: "我的项目" },
];

function resolveActiveKey(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/projects") || pathname.startsWith("/tasks")) return "/";
  return "/";
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = resolveActiveKey(location.pathname);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Header
        className="glass-header"
        style={{ display: "flex", alignItems: "center", height: 64, padding: "0 24px", gap: 0 }}
      >
        {/* Logo */}
        <Link to="/" className="logo-glow" style={{ fontSize: 22, letterSpacing: "-0.5px", flexShrink: 0 }}>
          scLens
        </Link>
        <Typography.Text style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          marginLeft: 10,
          marginRight: 32,
          flexShrink: 0,
          fontWeight: 500,
        }}>
          Web Console
        </Typography.Text>

        {/* Horizontal Nav */}
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          onClick={({ key }) => void navigate(key)}
          items={NAV_ITEMS}
          theme="dark"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            lineHeight: "62px",
          }}
        />
      </Layout.Header>

      <Layout.Content style={{ padding: "40px 24px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
