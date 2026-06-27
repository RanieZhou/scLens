import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell.js";
import { ProjectListPage } from "../pages/projects/ProjectListPage.js";
import { ProjectDetailPage } from "../pages/projects/ProjectDetailPage.js";
import { PairingPage } from "../pages/pairing/PairingPage.js";
import { TaskDetailPage } from "../pages/tasks/TaskDetailPage.js";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <ProjectListPage /> },
      { path: "projects/:projectId", element: <ProjectDetailPage /> },
      { path: "projects/:projectId/pair", element: <PairingPage /> },
      { path: "tasks/:taskId", element: <TaskDetailPage /> }
    ]
  }
]);
