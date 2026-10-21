import "katex/dist/katex.min.css";
import "./styles/base.css";
import "./styles/app.css";
import "./styles/theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { RouterProvider } from "./router";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>,
);
