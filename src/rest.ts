import fetch from "cross-fetch";

export function makeClient({ token }: { token: string }) {
  return {
    get(route: string, r: RequestInit = {}) {
      return fetch(`https://functions.prod.internal.glideapps.com/api${route}`, {
        method: "GET",
        ...r,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...r.headers,
        },
      });
    },
  };
}

export type Client = ReturnType<typeof makeClient>;
