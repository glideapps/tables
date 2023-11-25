import fetch from "cross-fetch";
import { defaultEndpointREST } from "./constants";

export function makeClient({
  token = process.env.GLIDE_TOKEN!,
  endpoint = defaultEndpointREST,
}: { token?: string; endpoint?: string } = {}) {
  function api(route: string, r: RequestInit = {}) {
    return fetch(`${endpoint}${route}`, {
      method: "GET",
      ...r,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...r.headers,
      },
    });
  }
  return {
    get: (r: string) => api(r, { method: "GET" }),
    post: (r: string, body: any) => api(r, { method: "POST", body: JSON.stringify(body) }),
  };
}

export type Client = ReturnType<typeof makeClient>;
