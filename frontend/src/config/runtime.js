const DEFAULT_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:4000",
  wsUrl: import.meta.env.VITE_WS_URL || "http://localhost:4000"
};

const STORAGE_KEY = "wa_runtime_config";

const isValidUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
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

export const setRuntimeConfig = (config) => {
  const payload = {
    ...pickConfig(config)
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.__RUNTIME_CONFIG__ = {
    ...DEFAULT_CONFIG,
    ...payload
  };
};

export const loadRuntimeConfig = async () => {
  let fileConfig = null;
  let localConfig = null;

  try {
    const response = await fetch(`/config.json?t=${Date.now()}`, { cache: "no-store" });
    if (response.ok) {
      const json = await response.json();
      fileConfig = pickConfig(json);
    }
  } catch {
    fileConfig = null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      localConfig = pickConfig(parsed);
    }
  } catch {
    localConfig = null;
  }

  const merged = {
    ...DEFAULT_CONFIG,
    ...(fileConfig || {}),
    ...(localConfig || {})
  };

  const hasExternalConfig = Boolean(
    (fileConfig && (fileConfig.apiUrl || fileConfig.wsUrl)) ||
      (localConfig && (localConfig.apiUrl || localConfig.wsUrl))
  );

  const needsSetup = import.meta.env.PROD && !hasExternalConfig;

  const normalized = {
    apiUrl: isValidUrl(merged.apiUrl) ? merged.apiUrl : DEFAULT_CONFIG.apiUrl,
    wsUrl: isValidUrl(merged.wsUrl) ? merged.wsUrl : DEFAULT_CONFIG.wsUrl
  };

  window.__RUNTIME_CONFIG__ = normalized;
  return { config: normalized, needsSetup };
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
