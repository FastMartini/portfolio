import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const host = "127.0.0.1";
const port = 4173;
const basePath = "/portfolio";
const exportRoot = resolve("out");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function resolveRequestPath(pathname) {
  if (pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    return null;
  }

  const relativePath = pathname.slice(basePath.length).replace(/^\/+/, "");
  return relativePath === "" || relativePath.endsWith("/")
    ? `${relativePath}index.html`
    : relativePath;
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${host}:${port}`);
    const requestPath = resolveRequestPath(decodeURIComponent(url.pathname));

    if (requestPath === null) {
      response.writeHead(404).end("Not found");
      return;
    }

    let filePath = resolve(exportRoot, requestPath);
    if (!filePath.startsWith(`${exportRoot}${sep}`)) {
      response.writeHead(400).end("Invalid path");
      return;
    }

    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      filePath = resolve(filePath, "index.html");
    }

    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Serving static export at http://${host}:${port}${basePath}/`);
});
