type Operator = "<" | "<=" | "=" | "!=" | ">=" | ">";
type IsNull = "IS NULL" | "IS NOT NULL";

type Order = "ASC" | "DESC";

type ValuePredicate<TRow> = {
  column: keyof TRow;
  compare: Operator;
  other: keyof TRow | string | number;
};

type NullPredicate<TRow> = {
  column: keyof TRow;
  compare: IsNull;
};

type Predicate<TRow> = ValuePredicate<TRow> | NullPredicate<TRow>;

function predicateToSQL<TRow>(
  predicate: Predicate<TRow>,
  resolveName: (key: keyof TRow) => string
): string {
  if ("other" in predicate) {
    // TODO this is a bit too tricky. If the RHS, we treat it as such. Otherwise we use it bare.
    const otherIsColumn = resolveName(predicate.other as keyof TRow) !== undefined;
    if (otherIsColumn) {
      return `"${resolveName(predicate.column)}" ${predicate.compare} "${resolveName(
        predicate.other as keyof TRow
      )}"`;
    } else {
      const bareValue =
        typeof predicate.other === "string" ? `'${predicate.other}'` : predicate.other;
      return `"${resolveName(predicate.column)}" ${predicate.compare} ${String(bareValue)}`;
    }
  }
  return `"${resolveName(predicate.column)}" ${predicate.compare}`;
}

export interface ToSQL {
  toSQL(): string | undefined;
}

export interface Query<TRow, TOmit extends string = ""> extends ToSQL {
  orderBy(
    column: keyof TRow,
    order?: Order
  ): Omit<Query<TRow, TOmit | "orderBy">, TOmit | "orderBy">;

  where(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;

  where(
    column: keyof TRow,
    compare: IsNull
  ): Omit<QueryAnd<TRow, TOmit | "where"> & QueryOr<TRow, TOmit | "where">, TOmit | "where">;

  limit(n: number): Omit<Query<TRow, TOmit | "limit">, TOmit | "limit">;
}

interface QueryAnd<TRow, TOmit extends string = ""> extends Query<TRow, TOmit> {
  and(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryAnd<TRow, TOmit>, TOmit>;
  and(column: keyof TRow, compare: IsNull): Omit<QueryAnd<TRow, TOmit>, TOmit>;
}

interface QueryOr<TRow, TOmit extends string = ""> extends Query<TRow, TOmit> {
  or(
    column: keyof TRow,
    compare: Operator,
    other: keyof TRow | string | number
  ): Omit<QueryOr<TRow, TOmit>, TOmit>;
  or(column: keyof TRow, compare: IsNull): Omit<QueryOr<TRow, TOmit>, TOmit>;
}

export class QueryBuilder<TRow, TOmit extends string = "">
  implements Query<TRow, TOmit>, QueryAnd<TRow, TOmit>, QueryOr<TRow, TOmit>
{
  private _limit: number | undefined;
  private _orderBy: { column: keyof TRow; order?: Order } | undefined;

  private _where: Predicate<TRow> | undefined;
  private _and: Predicate<TRow>[] = [];
  private _or: Predicate<TRow>[] = [];

  constructor(private props: { table: string; displayNameToName(name: keyof TRow): string }) {}

  public toSQL(): string | undefined {
    const { table, displayNameToName } = this.props;
    let q = `SELECT * FROM "${table}"`;

    const predicates = [
      ...(this._where === undefined ? [] : [this._where]),
      ...this._and,
      ...this._or,
    ];

    if (predicates.length > 0) {
      q += ` WHERE `;

      const AND_OR = this._and.length > 0 ? ` AND ` : ` OR `;
      q += predicates.map(p => predicateToSQL(p, displayNameToName)).join(AND_OR);
    }

    if (this._orderBy !== undefined) {
      const { column, order = "ASC" } = this._orderBy;
      q += ` ORDER BY "${displayNameToName(column)}" ${order}`;
    }

    if (this._limit !== undefined) {
      q += ` LIMIT ${this._limit}`;
    }
    return q;
  }

  orderBy(
    column: keyof TRow,
    order?: Order
  ): Omit<Query<TRow, TOmit | "orderBy">, TOmit | "orderBy"> {
    this._orderBy = { column, order };
    return this as any;
  }

  limit(n: number) {
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
