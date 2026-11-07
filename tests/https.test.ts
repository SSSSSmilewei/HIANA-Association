import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { memoryD1 } from "../scripts/local-d1";
import type { Env } from "../src/worker/env";
import worker from "../src/worker/index";

describe("强制 HTTPS", () => {
  test("页面、静态资源、API 在访问任何绑定前以 308 跳转，保留路径和参数", async () => {
    for (const path of ["/", "/courses/local-demo?tab=content", "/intro/", "/assets/app.js", "/api/auth/login"]) {
      // 空环境保证跳转前不会访问数据库或静态资源；POST 也必须先跳转。
      const req = new Request(`http://study.example${path}`, { method: path.startsWith("/api/") ? "POST" : "GET" });
      const res = await worker.fetch(req, {} as Env);
      expect(res.status).toBe(308);
      expect(res.headers.get("location")).toBe(`https://study.example${path}`);
    }
  });

  test("HTTPS 不重定向，保留静态响应内容、状态和缓存头，并加 HSTS", async () => {
    let called = 0;
    const env = { ASSETS: { fetch: async () => {
      called++;
      return new Response("课程内容", { status: 200, headers: { "content-type": "text/html", "cache-control": "public, max-age=60" } });
    } } } as unknown as Env;
    const res = await worker.fetch(new Request("https://study.example/courses"), env);
    expect(called).toBe(1);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("课程内容");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    expect(res.headers.get("strict-transport-security")).toBe("max-age=31536000");
  });

  test("本地开发可继续使用 HTTP，普通公网域名不能伪装成 localhost", async () => {
    const env = { ASSETS: { fetch: async () => new Response("local") } } as unknown as Env;
    for (const host of ["localhost:8787", "dev.localhost:8787", "127.0.0.1:8787", "127.0.0.2:8787", "[::1]:8787"]) {
      const res = await worker.fetch(new Request(`http://${host}/`), env);
      expect(res.status).toBe(200);
      expect(res.headers.get("strict-transport-security")).toBeNull();
    }
    for (const host of ["localhost.example", "127.0.0.1.example"]) {
      expect((await worker.fetch(new Request(`http://${host}/`), {} as Env)).status).toBe(308);
    }
  });

  test("HTTPS API 正常返回并带 HSTS，不信任客户端伪造的转发协议", async () => {
    const env = { DB: memoryD1(), SESSION_SECRET: "test-session-secret-0123456789abcdef" } as unknown as Env;
    const res = await worker.fetch(new Request("https://study.example/api/health"), env);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(res.headers.get("strict-transport-security")).toBe("max-age=31536000");
    const redirect = await worker.fetch(new Request("http://study.example/api/health", { headers: { "x-forwarded-proto": "https" } }), {} as Env);
    expect(redirect.status).toBe(308);
  });

  test("Cloudflare 配置确保静态资源也经过 Worker", () => {
    const config = readFileSync("wrangler.jsonc", "utf8");
    expect(config).toMatch(/"run_worker_first"\s*:\s*true/);
  });
});
