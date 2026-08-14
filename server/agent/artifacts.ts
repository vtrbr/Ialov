export type ExtractedArtifact = {
  language: string;
  filePath: string;
  content: string;
  kind: "code" | "html";
  previewMode: "none" | "html" | "react";
};

const artifactPattern = /```([\w+-]+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g;

function normalisePath(value: string) {
  const path = value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!path || path.length > 320 || path.startsWith("/") || path.includes("..") || /[:?#[\]]/.test(path)) return null;
  return path;
}

function previewMode(language: string): ExtractedArtifact["previewMode"] {
  if (language.toLowerCase() === "html") return "html";
  if (["tsx", "jsx"].includes(language.toLowerCase())) return "react";
  return "none";
}

export function parseAgentArtifacts(response: string): ExtractedArtifact[] {
  artifactPattern.lastIndex = 0;
  const seen = new Set<string>();
  const artifacts: ExtractedArtifact[] = [];
  for (const match of Array.from(response.matchAll(artifactPattern))) {
    const language = (match[1] || "text").toLowerCase();
    const filePath = normalisePath(match[2] || "");
    const content = (match[3] || "").trimEnd();
    if (!filePath || !content || seen.has(filePath)) continue;
    seen.add(filePath);
    artifacts.push({
      language,
      filePath,
      content,
      kind: language === "html" ? "html" : "code",
      previewMode: previewMode(language),
    });
  }
  return artifacts;
}

export function artifactTitle(filePath: string) {
  return filePath.split("/").pop() || "artifact.txt";
}
