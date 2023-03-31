import type { TableProps, Row, ColumnSchema } from "./types";

import fetch from "cross-fetch";

class Table<T extends ColumnSchema> {
  constructor(private props: TableProps<T>) {}

  public async getAllRows(): Promise<Row<T>[]> {
    const response = await fetch(
      "https://api.glideapp.io/api/function/queryTables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GLIDE_TOKEN}`,
        },
        body: JSON.stringify({
          appID: this.props.app,
          queries: [{ tableName: this.props.table }],
        }),
      }
    );
    const [result] = await response.json();
    return result.rows;
  }
}

export function table<T extends ColumnSchema>(props: TableProps<T>) {
  return new Table<T>(props);
}
