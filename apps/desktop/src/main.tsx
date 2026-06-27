import React from "react";
import { createRoot } from "react-dom/client";
import { RunnerApp } from "./app/RunnerApp.js";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <RunnerApp />
  </React.StrictMode>
);
