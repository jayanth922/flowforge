const resolvePath = (
  obj: unknown,
  path: string,
): unknown => {
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const renderTemplate = (
  template: string,
  context: Record<string, unknown>,
): string => {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, expression: string) => {
    const parts = expression.trim().split("|");
    const path = parts[0]!.trim();
    const fallback = parts.length > 1 ? parts.slice(1).join("|").trim() : null;

    const resolved = resolvePath(context, path);

    if (resolved !== undefined && resolved !== null) {
      return formatValue(resolved);
    }

    if (fallback !== null) return fallback;

    return `[MISSING: ${path}]`;
  });
};
