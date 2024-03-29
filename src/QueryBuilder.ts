import { Query, QueryAnd, QueryOr, Order, Predicate, Operator, IsNull } from "./types";

function predicateToSQL<TRow>(
  predicate: Predicate<TRow>,
  resolveName: (key: keyof TRow) => string | undefined
): string {
  const { column, compare } = predicate;
  // If we cannot find the column name, we just use the column name as is.
  // It's possible that the column exists but we just don't know it on the client.
  const columnName = resolveName(column) ?? String(column);

  if ("other" in predicate) {
    const { other } = predicate;

    // TODO this is a bit too tricky. If the RHS matches a column name, we treat it as such. Otherwise we use it bare.
    const otherColumn = resolveName(other as keyof TRow);
    if (otherColumn !== undefined) {
      return `"${columnName}" ${compare} "${otherColumn}"`;
    } else {
      // We did not resolve the RHS to a column name, so we treat it as a value.
      // It's possible that this is actually a column that exists in the table,
      // but the client does not know about it.

      // This quoting is bad – we should require client users to do this.
      const bareValue = typeof other === "string" ? `'${other}'` : other;
      return `"${columnName}" ${compare} ${String(bareValue)}`;
    }
  }
  return `"${columnName}" ${compare}`;
}

export class QueryBuilder<TRow, TOmit extends string>
  implements Query<TRow, TOmit>, QueryAnd<TRow, TOmit>, QueryOr<TRow, TOmit>
{
  private _limit: number | undefined;
  private _orderBy: { column: keyof TRow; order?: Order } | undefined;

  private _where: Predicate<TRow> | undefined;
  private _and: Predicate<TRow>[] = [];
  private _or: Predicate<TRow>[] = [];

  constructor(
    private props: { table: string; displayNameToName(name: keyof TRow): string | undefined }
  ) {}

  public toSQL(): string {
    const { table, displayNameToName } = this.props;
    let sql = `SELECT * FROM "${table}"`;

    const predicates = this._where === undefined ? [] : [this._where, ...this._and, ...this._or];
    if (predicates.length > 0) {
      sql += ` WHERE `;

      const AND_OR = this._and.length > 0 ? ` AND ` : ` OR `;
      sql += predicates.map(p => predicateToSQL(p, displayNameToName)).join(AND_OR);
    }

    if (this._orderBy !== undefined) {
      const { column, order = "ASC" } = this._orderBy;
      // If we cannot find the column name, we just use the column name as is.
      // It's possible that the column exists but we just don't know it on the client.
      const columnName = displayNameToName(column) ?? String(column);
      sql += ` ORDER BY "${columnName}" ${order}`;
    }

    if (this._limit !== undefined) {
      sql += ` LIMIT ${this._limit}`;
    }

    return sql;
  }

  orderBy(
    column: keyof TRow,
    order?: Order
  ): Omit<Query<TRow, TOmit | "orderBy">, TOmit | "orderBy"> {
    this._orderBy = { column, order };
    return this as any;
  }

  limit(n: number): Omit<Query<TRow, TOmit | "limit">, TOmit | "limit"> {
    this._limit = n;
    return this as any;
  }

  where(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;
  where(
    column: keyof TRow,
    compare: IsNull
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;
  where(
    column: keyof TRow,
    compare: IsNull | Operator,
    other?: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where"> {
    this._where = { column, compare, other } as Predicate<TRow>;
    return this as any;
  }

  and(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit>, TOmit>;
  and(column: keyof TRow, compare: IsNull): Omit<QueryAnd<TRow, TOmit>, TOmit>;
  and(
    column: keyof TRow,
    compare: IsNull | Operator,
    other?: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit>, TOmit> {
    this._and.push({ column, compare, other } as Predicate<TRow>);
    return this as any;
  }

  or(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryOr<TRow, TOmit>, TOmit>;
  or(column: keyof TRow, compare: IsNull): Omit<QueryOr<TRow, TOmit>, TOmit>;
  or(
    column: keyof TRow,
    compare: IsNull | Operator,
    other?: keyof TRow | string | number
  ): Omit<QueryOr<TRow, TOmit>, TOmit> {
    this._or.push({ column, compare, other } as Predicate<TRow>);
    return this as any;
  }
}
