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
