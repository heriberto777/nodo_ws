import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { loadRuntimeConfig } from "./config/runtime.js";
import { setApiBaseUrl } from "./api/client.js";
import "./styles/index.css";

const bootstrap = async () => {
  const { config } = await loadRuntimeConfig();
  setApiBaseUrl(config.apiUrl);

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App runtimeConfig={config} />
    </React.StrictMode>
  );
};

bootstrap();
