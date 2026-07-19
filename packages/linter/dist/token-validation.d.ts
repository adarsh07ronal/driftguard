import type { CanonicalToken, TokenValidationReport } from "./types";
export declare function validateDesignTokensAgainstCss(designTokens: CanonicalToken[], cssTokens: CanonicalToken[]): TokenValidationReport;
export declare function validateMissingDesignTokensInCss(designTokens: CanonicalToken[], cssTokens: CanonicalToken[]): TokenValidationReport;
