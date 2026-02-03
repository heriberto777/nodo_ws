import axios from "axios";

const defaultApiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: `${defaultApiUrl}/api`
});

export const setApiBaseUrl = (apiUrl) => {
  if (!apiUrl || typeof apiUrl !== "string") return;
  api.defaults.baseURL = `${apiUrl.replace(/\/$/, "")}/api`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("wa_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("wa_token");
      localStorage.removeItem("wa_user");
      window.dispatchEvent(new Event("wa:logout"));
    }
    return Promise.reject(error);
  }
);
