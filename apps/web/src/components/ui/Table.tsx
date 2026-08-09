import { Table as AntTable, type TableProps } from "antd";
import type { ColumnsType } from "antd/es/table";

export type { TableProps };
export type Columns<T> = ColumnsType<T>;

export function Table<T extends object>(props: TableProps<T>) {
  return <AntTable<T> {...props} />;
}
