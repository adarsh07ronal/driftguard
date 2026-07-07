export type LintSeverity = "error" | "warning" | "info";

export interface LintFixSuggestion {
  title: string;
  // YAML block the user can paste into DESIGN.md
  patch?: string;
  // A GitHub suggestion block payload (best-effort; requires line-level review comments)
  suggestion?: string;
}

export interface LintFinding {
  severity: LintSeverity;
  rule: string;
  path: string;
  message: string;
  line?: number;
  fix?: LintFixSuggestion;
}

export interface LintReport {
  findings: LintFinding[];
  summary: { errors: number; warnings: number; info: number };
}

export interface DesignSystem {
  version?: string;
  name: string;
  description?: string;
  colors: Record<string, string>;
  typography: Record<
    string,
    | {
        fontFamily?: string;
        fontSize?: string;
        fontWeight?: string | number;
        lineHeight?: string;
        letterSpacing?: string;
      }
    | undefined
  >;
  spacing: Record<string, string | number>;
  rounded: Record<string, string>;
  components?: Record<string, Record<string, string | undefined>>;
}

export type TokenCategory =
  | "color"
  | "spacing"
  | "radius"
  | "typography"
  | "component"
  | "other";

export type TokenSource = "design-md" | "css";

export type TokenPrimitive = string | number | boolean | null;

export interface CanonicalToken {
  name: string;
  path: string;
  category: TokenCategory;
  rawValue: TokenPrimitive;
  normalizedValue: string;
  source: TokenSource;
}

export interface TokenValidationFinding {
  severity: LintSeverity;
  rule: string;
  tokenPath: string;
  message: string;
  expected?: string;
  actual?: string;
}

export interface TokenValidationReport {
  findings: TokenValidationFinding[];
  summary: { errors: number; warnings: number; info: number };
}
