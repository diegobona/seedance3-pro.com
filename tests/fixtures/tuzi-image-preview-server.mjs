import http from "node:http";
import { readFileSync } from "node:fs";

const port = Number(process.env.PORT || 4322);
const imageBase64 = readFileSync(
  new URL("../../assets/apple-touch-icon.png", import.meta.url)
).toString("base64");

const server = http.createServer((request, response) => {
  if (
    request.method === "POST" &&
    (request.url === "/v1/images/generations" ||
      request.url === "/v1/images/edits")
  ) {
    request.resume();
    setTimeout(() => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ b64_json: imageBase64 }] }));
    }, 250);
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Mock tu-zi image API listening on ${port}\n`);
});
