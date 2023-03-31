import type { TableProps, Row, ColumnSchema } from "./types";

import fetch from "cross-fetch";

class Table<T extends ColumnSchema> {
  private props: TableProps<T>;

  constructor(props: TableProps<T>) {
    this.props = {
      token: process.env.GLIDE_TOKEN,
      ...props,
    };
  }

  public async getAllRows(): Promise<Row<T>[]> {
    const { token, app, table } = this.props;

    const response = await fetch(
      "https://api.glideapp.io/api/function/queryTables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appID: app,
          queries: [{ tableName: table }],
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
