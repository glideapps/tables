import camelCase from "lodash/camelCase";
import { APITableSchema, AppProps, TableProps } from "../types";
import { Table } from "../Table";
import { Glide } from "../Glide";

const preamble = `import * as glide from "@glideapps/tables";`;

function makeColumnSchema(table: APITableSchema) {
  return table.columns.map(c => {
    return { displayName: c.name, internalName: c.id, type: c.type.kind };
  });
}

function isValidIdentifier(str: string): boolean {
  // Check for empty string
  if (str === "") return false;

  // Check if the first character is a valid start character
  if (!/^[\p{L}_$]/u.test(str[0])) return false;

  // Check if the rest of the characters are valid identifier characters
  if (!/^[\p{L}\p{N}_$]*$/u.test(str.slice(1))) return false;

  // Check for reserved words
  const reservedWords = new Set([
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",
    "enum",
    "null",
    "true",
    "false",
    "NaN",
    "Infinity",
    "undefined",
  ]);

  return !reservedWords.has(str);
}

function columnNamesToObjectPropertyNames(columnNames: string[]): Record<string, string> {
  const seen = new Set<string>();
  const renamed: Record<string, string> = {};
  for (const name of columnNames) {
    let rename = name;

    // Make it a valid identifier
    rename = camelCase(rename.replace(/[^a-zA-Z0-9_$]/g, "_"));

    if (!isValidIdentifier(rename)) {
      rename = camelCase("the_" + rename);
    }

    // Avoid conflicts
    let n = 1;
    let unique = rename;
    while (seen.has(unique)) {
      unique = rename + n++;
    }
    seen.add(unique);
    renamed[name] = unique;
  }

  return renamed;
}

function tableToJavaScriptColumnSchema(table: APITableSchema) {
  const columns = makeColumnSchema(table);
  const displayNameToObjectProperty = columnNamesToObjectPropertyNames(
    columns.map(c => c.displayName)
  );
  const lines = columns
    .map(({ displayName, internalName, type }, i) => {
      const safeProperty = displayNameToObjectProperty[displayName];
      const rhs = `{ type: ${JSON.stringify(type)}, name: ${JSON.stringify(internalName)} }`;
      const isLast = i === columns.length - 1;
      return `        ${safeProperty}: ${rhs}${isLast ? "" : ","}`;
    })
    .join("\n");
  return `{\n${lines}\n    }`;
}

export async function tableDefinition(
  glide: Glide,
  props: TableProps,
  appValue?: string,
  tables?: Table<{}>[]
) {
  const app = glide.app({ ...props, id: props.app });
  tables ??= await app.getTables();
  if (tables === undefined) throw new Error("Could not get tables");

  const table = tables.find(t => t.id === props.table);
  if (table === undefined) throw new Error("Could not find table");

  const schema = await table.getSchema();
  let src = `export const ${camelCase(table.name)} = `;
  if (appValue === undefined) {
    src += `glide.table({
    app: "${props.app}",`;
  } else {
    src += `${appValue}.table({`;
  }
  src += `
    name: "${table.name}",
    table: "${props.table}",
    columns: ${tableToJavaScriptColumnSchema(schema.data)}
});`;

  return src;
}

export async function appDefinition(glide: Glide, props: AppProps) {
  const apps = await glide.getApps();
  if (apps === undefined) throw new Error("Could not get apps");

  const app = apps.find(a => a.id === props.id);
  if (app === undefined) throw new Error("Could not find app");

  const tables = await app.getTables();
  if (tables === undefined) throw new Error("Could not get tables");

  const appName = camelCase(app.name);
  let src = preamble;

  src += `\n\nexport const ${appName} = glide.app({
    name: "${app.name}",
    id: "${props.id}",
});`;

  for (const table of tables) {
    const tableDeclaration = await tableDefinition(
      glide,
      { ...props, app: props.id, table: table.id, columns: {} },
      appName,
      tables
    );

    src += "\n\n" + tableDeclaration;
  }

  return src;
}
