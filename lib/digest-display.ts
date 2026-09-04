import { publicText } from "@/lib/public-text";

export function sanitizeDigestText(value: string) {
  return publicText(value).replace(
    /(新增\s+\d+\s*星评论)(?:\s*[：:]\s*[^；;\n。]*)/g,
    "$1"
  );
}

export function digestPreview(value: string) {
  const lines = sanitizeDigestText(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines[0]?.startsWith("[日报]")) {
    lines.shift();
  }

  return lines.join("\n");
}
