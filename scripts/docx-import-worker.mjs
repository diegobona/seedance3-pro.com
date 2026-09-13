import { convertDocxBufferToArticle } from "./docx-import.mjs";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

try {
  const article = await convertDocxBufferToArticle(Buffer.concat(chunks));
  process.stdout.write(JSON.stringify({ success: true, article }));
} catch (error) {
  process.stdout.write(JSON.stringify({
    success: false,
    message: String(error?.message || "Word document import failed."),
  }));
}
