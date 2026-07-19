import type { CanonicalToken } from "./types";

const ROOT_BLOCK_REGEX = /:root\s*\{([\s\S]*?)\}/g;
const CSS_VAR_DECL_REGEX = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;

export function extractCanonicalTokensFromCssVariables(css: string): CanonicalToken[] {
  const out: CanonicalToken[] = [];
  let rootMatch: RegExpExecArray | null;

  while ((rootMatch = ROOT_BLOCK_REGEX.exec(css)) !== null) {
    const body = rootMatch[1] ?? "";
    let declMatch: RegExpExecArray | null;

    while ((declMatch = CSS_VAR_DECL_REGEX.exec(body)) !== null) {
      const rawName = declMatch[1];
      const rawValue = (declMatch[2] ?? "").trim();
      if (!rawName || !rawValue) continue;

      out.push({
        name: rawName,
        path: `css.${rawName}`,
        category: inferCssTokenCategory(rawName),
        rawValue,
        normalizedValue: normalizeTokenValue(rawValue),
        source: "css",
      });
    }
  }

  return out;
}

function inferCssTokenCategory(name: string): CanonicalToken["category"] {
  if (/^(color|primary|secondary|success|danger|warning|info|neutral|surface|background)/i.test(name)) {
    return "color";
  }
  if (/^(space|spacing|gap|pad|padding|margin)/i.test(name)) {
    return "spacing";
  }
  if (/^(radius|rounded|radii)/i.test(name)) {
    return "radius";
  }
  if (/^(font|text|type|typography)/i.test(name)) {
    return "typography";
  }
  return "other";
}

function normalizeTokenValue(value: string): string {
  const trimmed = value.trim();
  const normalizedHex = normalizeHex(trimmed);
  if (normalizedHex) return normalizedHex;
  return trimmed;
}

function normalizeHex(value: string): string | null {
  const v = value.toLowerCase();

  if (/^#[0-9a-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }

  if (/^#[0-9a-f]{6}$/.test(v)) {
    return v;
  }

  return null;
}
