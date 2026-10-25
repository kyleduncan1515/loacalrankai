import fs from "node:fs";

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim()));
  const [header, ...body] = nonEmpty;
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

function escape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Appends rows to a CSV, writing the header first if the file is new. */
export function appendCsv(path: string, columns: string[], rows: Record<string, string>[]): void {
  const lines = rows.map((r) => columns.map((c) => escape(r[c] ?? "")).join(","));
  const prefix = fs.existsSync(path) ? "" : columns.join(",") + "\n";
  fs.appendFileSync(path, prefix + lines.join("\n") + "\n");
}

export function readCsv(path: string): Record<string, string>[] {
  return parseCsv(fs.readFileSync(path, "utf8"));
}
