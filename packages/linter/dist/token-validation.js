"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDesignTokensAgainstCss = validateDesignTokensAgainstCss;
exports.validateMissingDesignTokensInCss = validateMissingDesignTokensInCss;
const VALIDATED_DESIGN_CATEGORIES = new Set([
    "color",
    "spacing",
    "radius",
]);
function validateDesignTokensAgainstCss(designTokens, cssTokens) {
    const findings = [];
    const cssTokenMap = new Map(cssTokens
        .filter((t) => t.source === "css")
        .map((t) => [normalizeCssVarName(t.name), t]));
    const expectedCssVars = new Set();
    for (const token of designTokens) {
        if (token.source !== "design-md")
            continue;
        if (!VALIDATED_DESIGN_CATEGORIES.has(token.category))
            continue;
        const expectedVars = designTokenToCssVarCandidates(token.path);
        expectedVars.forEach((v) => expectedCssVars.add(v));
        const matchedVarName = expectedVars.find((v) => cssTokenMap.has(v));
        if (!matchedVarName) {
            findings.push({
                severity: "error",
                rule: "missing-token-in-css",
                tokenPath: token.path,
                message: `Design token \"${token.path}\" is not defined as a CSS variable.`,
                expected: expectedVars.map((v) => `--${v}`).join(" or "),
            });
            continue;
        }
        const cssToken = cssTokenMap.get(matchedVarName);
        if (!cssToken)
            continue;
        if (token.normalizedValue !== cssToken.normalizedValue) {
            findings.push({
                severity: "error",
                rule: "token-value-mismatch",
                tokenPath: token.path,
                message: `Token value mismatch for \"${token.path}\".`,
                expected: token.normalizedValue,
                actual: cssToken.normalizedValue,
            });
        }
    }
    for (const cssToken of cssTokens) {
        if (cssToken.source !== "css")
            continue;
        if (!VALIDATED_DESIGN_CATEGORIES.has(cssToken.category))
            continue;
        const normalizedName = normalizeCssVarName(cssToken.name);
        if (!expectedCssVars.has(normalizedName)) {
            findings.push({
                severity: "warning",
                rule: "unused-css-token",
                tokenPath: `css.${normalizedName}`,
                message: `CSS variable --${normalizedName} is defined but not mapped from DESIGN.md tokens.`,
            });
        }
    }
    return buildReport(findings);
}
function validateMissingDesignTokensInCss(designTokens, cssTokens) {
    return validateDesignTokensAgainstCss(designTokens, cssTokens);
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
function designTokenToCssVarCandidates(path) {
    const parts = path.split(".");
    if (parts.length < 2)
        return [toKebab(parts.join("-"))];
    const [group, ...rest] = parts;
    const tail = toKebab(rest.join("-"));
    if (group === "colors") {
        return [tail];
    }
    if (group === "spacing") {
        return [`spacing-${tail}`];
    }
    if (group === "rounded") {
        return [`rounded-${tail}`, `radius-${tail}`];
    }
    return [toKebab(path.replace(/\./g, "-"))];
}
function normalizeCssVarName(name) {
    return name.replace(/^--/, "").trim().toLowerCase();
}
function toKebab(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/[_\s]+/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}
