/* ============================================================
   API — thin fetch() wrapper for talking to the backend
   ============================================================ */

const Api = (() => {
  class UnauthorizedError extends Error {}

  async function request(path, options = {}) {
    const res = await fetch(`/api${path}`, {
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      ...options,
    });

    if (res.status === 401) {
      throw new UnauthorizedError("未登录");
    }

    if (!res.ok) {
      let message = `请求失败 (${res.status})`;
      try {
        const body = await res.json();
        if (body?.detail) message = body.detail;
      } catch (_) {
        /* ignore */
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  return {
    UnauthorizedError,
    get: (path) => request(path),
    put: (path, data) => request(path, { method: "PUT", body: JSON.stringify(data) }),
    post: (path, data) =>
      request(path, { method: "POST", body: data === undefined ? undefined : JSON.stringify(data) }),
    del: (path) => request(path, { method: "DELETE" }),
  };
})();
