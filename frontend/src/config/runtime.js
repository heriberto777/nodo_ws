const DEFAULT_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
  wsUrl: import.meta.env.VITE_WS_URL || "http://localhost:4000"
};

const isValidUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return ["http:", "https:", "ws:", "wss:"].includes(url.protocol);
  } catch {
    return false;
  }
};

const sanitize = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const pickConfig = (source = {}) => {
  const apiUrl = sanitize(source.apiUrl);
  const wsUrl = sanitize(source.wsUrl);
  return {
    ...(apiUrl ? { apiUrl } : {}),
    ...(wsUrl ? { wsUrl } : {})
  };
};

export const getRuntimeConfig = () => {
  return window.__RUNTIME_CONFIG__ || { ...DEFAULT_CONFIG };
};

export const loadRuntimeConfig = async () => {
  let fileConfig = null;

  try {
    const response = await fetch(`/config.json?t=${Date.now()}`, { 
      cache: "no-store",
      credentials: "same-origin"
    });
    if (response.ok) {
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        console.warn("config.json is empty, using defaults");
        fileConfig = null;
      } else {
        try {
          const json = JSON.parse(text);
          fileConfig = pickConfig(json);
        } catch (parseError) {
          console.error("Failed to parse config.json:", parseError.message);
          fileConfig = null;
        }
      }
    } else {
      console.warn(`Failed to load config.json: HTTP ${response.status}`);
      fileConfig = null;
    }
  } catch (error) {
    console.warn("Error loading config.json:", error.message);
    fileConfig = null;
  }

  const merged = {
    ...DEFAULT_CONFIG,
    ...(fileConfig || {})
  };

  const normalized = {
    apiUrl: isValidUrl(merged.apiUrl) ? merged.apiUrl : DEFAULT_CONFIG.apiUrl,
    wsUrl: isValidUrl(merged.wsUrl) ? merged.wsUrl : DEFAULT_CONFIG.wsUrl
  };

  console.log("Runtime config loaded:", { apiUrl: normalized.apiUrl, wsUrl: normalized.wsUrl });
  window.__RUNTIME_CONFIG__ = normalized;
  return { config: normalized };
};

export const saveRuntimeConfigToServer = async ({ apiUrl, wsUrl, token }) => {
  const cleanApi = sanitize(apiUrl);
  const cleanWs = sanitize(wsUrl);
  if (!cleanApi || !cleanWs) {
    throw new Error("Invalid apiUrl or wsUrl");
  }

  const baseUrl = cleanApi.replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["x-config-token"] = token;
  }

  const response = await fetch(`${baseUrl}/api/config/runtime`, {
    method: "POST",
    headers,
    body: JSON.stringify({ apiUrl: cleanApi, wsUrl: cleanWs })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to write config");
  }

  return true;
};
