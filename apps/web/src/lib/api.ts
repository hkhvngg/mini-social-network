import axios from "axios";

const TOKEN_KEY = "misonet_access_token";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_API_URL");
}

const normalizedApiUrl = API_URL.replace(/\/$/, "");

export const api = axios.create({
  baseURL: normalizedApiUrl,
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith("/login") &&
      !window.location.pathname.startsWith("/register")
    ) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function readToken() {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(TOKEN_KEY);
}

export function readTokenExpiresAt(): number | null {
  const token = readToken();
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(window.atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function getApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message[0] ?? "Có vài thông tin cần bạn kiểm tra lại.";
    if (typeof message === "string") return message;
    if (error.code === "ECONNABORTED") {
      return "Phản hồi hơi lâu. Bạn thử lại một lần nữa nhé.";
    }
    if (!error.response) {
      return "Chưa kết nối được tới Misonet. Bạn kiểm tra mạng rồi thử lại nhé.";
    }
  }
  return "Misonet đang gặp chút trục trặc. Bạn thử lại sau nhé.";
}
