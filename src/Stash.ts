import { BigTable } from "./BigTable";
import { throwError } from "./common";
import { Glide } from "./Glide";
import { ColumnSchema, Row } from "./types";

type StashProps<T extends ColumnSchema = {}> = {
  stashId: string;
  bigTable: BigTable<T>;
};

export class Stash<T extends ColumnSchema = {}> {
  public get stashId(): string {
    return this.props.stashId;
  }

  indexOfLastAdd = 0;

  getSerial(): string {
    return `${this.indexOfLastAdd++}`;
  }

  constructor(private props: StashProps<T>, private glide: Glide) {}

  public async add(rows: Row<T>[]) {
    const serial = this.getSerial();
    const url = `/stashes/${this.props.stashId}/${serial}`;
    console.log(url);
    const response = await this.glide.post(`/stashes/${this.props.stashId}/${serial}`, rows);
    if (response.status !== 200) {
      const text = await response.text();
      console.log(text);
      throw new Error(`Error adding to stash: ${text}`);
    }
    await throwError(response);
  }
}
