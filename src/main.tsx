
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router-dom";
  import App from "./App.tsx";
  import "./index.css";
  import "./styles/globals.css";
  import { auth } from "./shared/services/firebase";

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    const resolvedUrl = new URL(rawUrl, window.location.origin);
    const isApiRequest = resolvedUrl.pathname.startsWith("/api");

    if (!isApiRequest) {
      return originalFetch(input, init);
    }

    const headers = new Headers(
      init?.headers ??
      (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined)
    );

    if (!headers.has("Authorization")) {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    return originalFetch(input, { ...init, headers });
  };

  // Tema fijo oscuro para toda la app
  document.documentElement.classList.add("dark");
  document.documentElement.setAttribute("data-theme", "dark");
  window.localStorage.removeItem("barberia-theme");

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
