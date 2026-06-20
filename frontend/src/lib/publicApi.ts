import axios from "axios";
import { API_BASE_URL } from "./api";

export const publicClient = axios.create({
  baseURL: API_BASE_URL,
});

export const publicSharesApi = {
  get: (token: string, password?: string) =>
    publicClient.get(`/shares/public/${token}`, { params: { password } }),
  download: (token: string, password?: string) =>
    publicClient.get(`/shares/public/${token}/download`, {
      params: { password },
      responseType: "blob",
    }),
  streamUrl: (token: string, password?: string) => {
    const params = password ? `?password=${encodeURIComponent(password)}` : "";
    return `${API_BASE_URL}/shares/public/${token}/stream${params}`;
  },
};
