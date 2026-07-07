"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCanonicalTokensFromDesignSystem = extractCanonicalTokensFromDesignSystem;
const DESIGN_MD_META_KEYS = new Set(["name", "description", "version"]);
function extractCanonicalTokensFromDesignSystem(tokens) {
    const out = [];
    for (const [topKey, value] of Object.entries(tokens)) {
        if (DESIGN_MD_META_KEYS.has(topKey))
            continue;
        const category = mapTopLevelCategory(topKey);
        collectLeafTokens(value, [topKey], category, out);
    }
    return out;
}
function collectLeafTokens(value, path, category, out) {
    if (isPrimitive(value)) {
        out.push(buildCanonicalToken(path, category, value));
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => collectLeafTokens(item, [...path, String(index)], category, out));
        return;
    }
    if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
            collectLeafTokens(v, [...path, k], category, out);
        }
    }
}
function buildCanonicalToken(path, category, rawValue) {
    return {
        name: path[path.length - 1] ?? "",
        path: path.join("."),
        category,
        rawValue,
        normalizedValue: normalizeTokenValue(rawValue),
        source: "design-md",
    };
}
function mapTopLevelCategory(topKey) {
    switch (topKey) {
        case "colors":
            return "color";
        case "spacing":
            return "spacing";
        case "rounded":
            return "radius";
        case "typography":
            return "typography";
        case "components":
            return "component";
        default:
            return "other";
    }
}
function normalizeTokenValue(value) {
    if (value === null)
        return "null";
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    const trimmed = value.trim();
    const normalizedHex = normalizeHex(trimmed);
    if (normalizedHex)
        return normalizedHex;
    return trimmed;
}
function normalizeHex(value) {
    const v = value.toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(v)) {
        return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    if (/^#[0-9a-f]{6}$/.test(v)) {
        return v;
    }
    return null;
}
function isPrimitive(value) {
    return (value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean");
}
