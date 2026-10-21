import "./styles/tokens.css";
import "./styles/ui.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyPrefs, readPrefs } from "./prefs";
import { RouterProvider } from "./router";
import { ConfirmProvider, ToastProvider } from "./ui";

applyPrefs(readPrefs());

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RouterProvider>
      <ToastProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </ToastProvider>
    </RouterProvider>
  </StrictMode>,
);
