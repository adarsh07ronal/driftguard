"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDesignMd = parseDesignMd;
exports.lintDesignMd = lintDesignMd;
const js_yaml_1 = __importDefault(require("js-yaml"));
function parseDesignMd(raw) {
    try {
        const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!match)
            return null;
        const yamlStr = match[1];
        const yamlLineOffset = 1;
        const tokens = js_yaml_1.default.load(yamlStr);
        if (!tokens || typeof tokens !== "object")
            return null;
        return { tokens, raw, yamlStr, yamlLineOffset };
    }
    catch {
        return null;
    }
}
function findYamlLine(yamlStr, path) {
    const parts = path.split(".");
    const lines = yamlStr.split("\n");
    let depth = 0;
    const lineNum = 1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const key = parts[depth];
        if (!key)
            break;
        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
        const trimmed = line.trim();
        if (trimmed.startsWith(`${key}:`) && indent === depth * 2) {
            if (depth === parts.length - 1)
                return lineNum + i;
            depth++;
        }
    }
    return undefined;
}
function lintDesignMd(doc) {
    const findings = [];
    const { tokens, yamlStr, yamlLineOffset } = doc;
    const addFinding = (severity, rule, path, message, fix) => {
        const line = findYamlLine(yamlStr, path);
        findings.push({
            severity,
            rule,
            path,
            message,
            line: line ? line + yamlLineOffset : undefined,
            fix,
        });
    };
    if (!tokens.colors || Object.keys(tokens.colors).length === 0) {
        addFinding("error", "missing-colors", "colors", "No colors defined. Add a colors section with at least a primary token.", {
            title: "Add a starter colors scale",
            patch: `colors:\n  primary: \"#1976d2\"\n  background: \"#ffffff\"\n  surface: \"#f8fafc\"\n  on-primary: \"#ffffff\"`,
            suggestion: `colors:\n  primary: \"#1976d2\"\n  background: \"#ffffff\"\n  surface: \"#f8fafc\"\n  on-primary: \"#ffffff\"`,
        });
        return buildReport(findings);
    }
    if (!tokens.colors.primary) {
        addFinding("warning", "missing-primary", "colors.primary", "No primary color defined — AI agents will auto-generate one, leading to inconsistent UIs.", {
            title: "Add a primary color token",
            patch: `primary: \"#1976d2\"`,
            suggestion: `primary: \"#1976d2\"`,
        });
    }
    function collectStringValues(obj, collected = []) {
        if (typeof obj === "string") {
            if (obj.startsWith("{") && obj.endsWith("}") && obj.includes(".")) {
                collected.push(obj);
            }
        }
        else if (Array.isArray(obj)) {
            obj.forEach((v) => collectStringValues(v, collected));
        }
        else if (obj && typeof obj === "object") {
            Object.values(obj).forEach((v) => collectStringValues(v, collected));
        }
        return collected;
    }
    const tokenRefs = collectStringValues(tokens);
    for (const ref of tokenRefs) {
        const inner = ref.slice(1, -1);
        const path = inner.split(".");
        let val = tokens;
        for (const key of path)
            val = val?.[key];
        if (val === undefined) {
            addFinding("error", "broken-ref", inner, `Token reference ${ref} does not resolve to any defined token.`);
        }
    }
    if (tokens.components) {
        for (const [name, comp] of Object.entries(tokens.components)) {
            if (!comp)
                continue;
            const bg = resolveRef(comp.backgroundColor, tokens);
            const fg = resolveRef(comp.textColor, tokens);
            if (bg && fg && isHex(bg) && isHex(fg)) {
                const ratio = contrastRatio(bg, fg);
                if (ratio !== null && ratio < 4.5) {
                    addFinding("warning", "contrast-ratio", `components.${name}`, `textColor (${fg}) on backgroundColor (${bg}) has contrast ratio ${ratio.toFixed(2)}:1 — below WCAG AA (4.5:1).`);
                }
            }
        }
    }
    const standardColorKeys = [
        "primary",
        "secondary",
        "tertiary",
        "neutral",
        "surface",
        "background",
        "on-primary",
        "on-secondary",
    ];
    if (tokens.colors &&
        tokens.components &&
        Object.keys(tokens.components).length > 0) {
        for (const colorKey of Object.keys(tokens.colors)) {
            if (standardColorKeys.includes(colorKey))
                continue;
            const refStr = `{colors.${colorKey}}`;
            const directRef = Object.values(tokens.components).some((c) => c && Object.values(c).some((v) => v === refStr));
            if (!directRef) {
                addFinding("info", "orphaned-tokens", `colors.${colorKey}`, `Color token "${colorKey}" is defined but never referenced by any component.`);
            }
        }
    }
    if (!tokens.typography || Object.keys(tokens.typography).length === 0) {
        addFinding("warning", "missing-typography", "typography", "No typography tokens defined — agents will use default system fonts.", {
            title: "Add starter typography tokens",
            patch: `typography:\n  h1:\n    fontFamily: \"Inter\"\n    fontSize: \"40px\"\n    fontWeight: 700\n    lineHeight: \"1.2\"\n  body-md:\n    fontFamily: \"Inter\"\n    fontSize: \"16px\"\n    fontWeight: 400\n    lineHeight: \"1.5\"`,
            suggestion: `typography:\n  h1:\n    fontFamily: \"Inter\"\n    fontSize: \"40px\"\n    fontWeight: 700\n    lineHeight: \"1.2\"\n  body-md:\n    fontFamily: \"Inter\"\n    fontSize: \"16px\"\n    fontWeight: 400\n    lineHeight: \"1.5\"`,
        });
    }
    if (!tokens.spacing || Object.keys(tokens.spacing).length === 0) {
        addFinding("info", "missing-sections", "spacing", "No spacing scale defined. Consider adding sm/md/lg tokens for consistent layout.");
    }
    if (!tokens.rounded || Object.keys(tokens.rounded).length === 0) {
        addFinding("info", "missing-sections", "rounded", "No border-radius tokens defined.");
    }
    const canonicalOrder = [
        "overview",
        "colors",
        "typography",
        "layout",
        "elevation",
        "shapes",
        "components",
        "do",
    ];
    const bodyMatch = doc.raw.match(/^---[\s\S]*?---\n?([\s\S]*)$/);
    if (bodyMatch) {
        const headings = [];
        const headingRegex = /^## (.+)$/gm;
        let hMatch;
        while ((hMatch = headingRegex.exec(bodyMatch[1])) !== null) {
            headings.push(hMatch[1].toLowerCase());
        }
        let lastIdx = -1;
        for (const h of headings) {
            const idx = canonicalOrder.findIndex((c) => h.includes(c));
            if (idx !== -1 && idx < lastIdx) {
                addFinding("warning", "section-order", "sections", `Section "${h}" appears out of canonical order. Expected: Overview → Colors → Typography → Layout → Components.`);
                break;
            }
            if (idx !== -1)
                lastIdx = idx;
        }
    }
    return buildReport(findings);
}
function buildReport(findings) {
    const summary = findings.reduce((acc, f) => {
        if (f.severity === "error")
            acc.errors++;
        else if (f.severity === "warning")
            acc.warnings++;
        else
            acc.info++;
        return acc;
    }, { errors: 0, warnings: 0, info: 0 });
    return { findings, summary };
}
function resolveRef(val, tokens) {
    if (!val)
        return undefined;
    if (!val.startsWith("{"))
        return val;
    const path = val.slice(1, -1).split(".");
    let v = tokens;
    for (const key of path)
        v = v?.[key];
    return typeof v === "string" ? v : undefined;
}
function isHex(s) {
    return /^#[0-9a-fA-F]{6}$/.test(s.trim());
}
function hexToLuminance(hex) {
    const h = hex.replace("#", "");
    const [r, g, b] = [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ].map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(bg, fg) {
    try {
        const l1 = hexToLuminance(bg);
        const l2 = hexToLuminance(fg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    catch {
        return null;
    }
}
