import { JSX, memo, useCallback, useMemo, useState } from "react";
import "../styles/ObjectTable.scss";
import { CustomButton, CustomInput, Icon } from "@uvcdr/custom-form-system";

type RowValue = unknown;
export type RowRecord = Record<string, RowValue>;

export type ObjectTableProps<T extends RowRecord> = {
  data: readonly T[];
  columns?: readonly (keyof T & string)[];
  maxHeight?: number | string;
  getRowKey?: (row: T, index: number) => string;
  emptyLabel?: string;
  className?: string;
  deleteLine?: (rowKey: string) => void;
};

type ActionsCol = "__actions__";
const ACTIONS_COL: ActionsCol = "__actions__";

type CellKey = `${string}:${string}`;

function toCssSize(
  value: number | string | undefined,
  fallback: string,
): string {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && value.trim().length > 0) return value;
  return fallback;
}

function safeStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "function") return "[Function]";
  if (typeof value === "symbol") return String(value);

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Unserializable]";
    }
  }

  return String(value);
}

function getUnionColumns<T extends RowRecord>(data: readonly T[]): string[] {
  const set = new Set<string>();
  for (const row of data) {
    for (const key of Object.keys(row)) set.add(key);
  }
  return Array.from(set);
}

type TableColumn<T extends RowRecord> = (keyof T & string) | ActionsCol;

type ObjectTableRowProps<T extends RowRecord> = {
  row: T;
  rowKey: string;
  columns: readonly TableColumn<T>[];
  modifyingCell: ReadonlyMap<CellKey, string>;
  onStartEdit: (cellKey: CellKey, initialValue: string) => void;
  onChangeDraft: (cellKey: CellKey, nextValue: string) => void;
  onToggleEdit: (cellKey: CellKey, initialValue: string) => void;
  onDeleteLine: (rowKey: string) => void;
};

const ObjectTableRow = memo(function ObjectTableRowInner<T extends RowRecord>({
  row,
  rowKey,
  columns,
  modifyingCell,
  onStartEdit,
  onChangeDraft,
  onToggleEdit,
  onDeleteLine,
}: ObjectTableRowProps<T>): JSX.Element {
  return (
    <tr className="object-table__row">
      {columns.map((col) => {
        if (col === ACTIONS_COL) {
          return (
            <td
              key={`${rowKey}:${ACTIONS_COL}`}
              className="object-table__cell object-table__cell--actions"
            >
              <div className="object-table__cell-content">
                <CustomButton
                  onClick={() => {
                    onDeleteLine(rowKey);
                  }}
                  size="xs"
                  leftIcon={<Icon iconName="trash"></Icon>}
                  variant="primary"
                >
                  Supprimer la ligne
                </CustomButton>
              </div>
            </td>
          );
        }

        const value = row[col];
        const text = safeStringify(value);
        const cellKey = `${rowKey}:${col}` as const satisfies CellKey;

        const isEditing = modifyingCell.has(cellKey);
        const draftValue = modifyingCell.get(cellKey) ?? text;

        return (
          <td key={cellKey} className="object-table__cell">
            <div
              className="object-table__cell-content"
              onDoubleClick={() => onStartEdit(cellKey, text)}
            >
              {isEditing ? (
                <CustomInput
                  type="text"
                  name={cellKey}
                  value={draftValue}
                  inputSize="xs"
                  onChange={(value: unknown) => {
                    const nextValue =
                      typeof value === "string" ? value : String(value);
                    onChangeDraft(cellKey, nextValue);
                  }}
                />
              ) : (
                <span className="object-table__cell-text" title={text}>
                  {text}
                </span>
              )}

              <CustomButton
                onClick={() => onToggleEdit(cellKey, text)}
                size="xs"
                leftIcon={<Icon iconName={isEditing ? "check" : "pen"}></Icon>}
                variant={isEditing ? "success" : "primary"}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}) as <T extends RowRecord>(props: ObjectTableRowProps<T>) => JSX.Element;

export function ObjectTable<T extends RowRecord>({
  data,
  columns,
  maxHeight = 360,
  getRowKey,
  emptyLabel = "Aucune donnée",
  className,
  deleteLine,
}: ObjectTableProps<T>): JSX.Element {
  const resolvedColumns = useMemo<readonly TableColumn<T>[]>(() => {
    const dataCols =
      columns && columns.length > 0
        ? [...columns]
        : data.length > 0
          ? getUnionColumns(data)
          : [];

    return [ACTIONS_COL, ...dataCols] as const;
  }, [columns, data]);

  const maxHeightCss = useMemo(
    () => toCssSize(maxHeight, "360px"),
    [maxHeight],
  );

  const [modifyingCell, setModifyingCell] = useState<Map<CellKey, string>>(
    () => new Map<CellKey, string>(),
  );

  const startEdit = useCallback((cellKey: CellKey, initialValue: string) => {
    setModifyingCell((prev) => {
      if (prev.has(cellKey)) return prev; // évite une Map copy inutile
      const next = new Map(prev);
      next.set(cellKey, initialValue);
      return next;
    });
  }, []);

  const changeDraft = useCallback((cellKey: CellKey, nextValue: string) => {
    setModifyingCell((prev) => {
      const prevValue = prev.get(cellKey);
      if (prevValue === nextValue) return prev; // évite re-render si inchangé
      const next = new Map(prev);
      next.set(cellKey, nextValue);
      return next;
    });
  }, []);

  const toggleEdit = useCallback((cellKey: CellKey, initialValue: string) => {
    setModifyingCell((prev) => {
      const next = new Map(prev);
      if (next.has(cellKey)) {
        next.delete(cellKey); // “valider/fermer” (tu peux brancher un onCommit ici)
      } else {
        next.set(cellKey, initialValue);
      }
      return next;
    });
  }, []);

  if (data.length === 0) {
    return (
      <section
        className={["object-table", className].filter(Boolean).join(" ")}
      >
        <div className="object-table__empty" role="status" aria-live="polite">
          {emptyLabel}
        </div>
      </section>
    );
  }

  return (
    <section className={["object-table", className].filter(Boolean).join(" ")}>
      <div
        className="object-table__scroller"
        style={{ maxHeight: maxHeightCss }}
        role="region"
        aria-label="Tableau de données"
      >
        <table className="object-table__table">
          <thead className="object-table__head">
            <tr className="object-table__head-row">
              {resolvedColumns.map((col) =>
                col === ACTIONS_COL ? (
                  <th
                    key={ACTIONS_COL}
                    className="object-table__head-cell object-table__head-cell--actions"
                    scope="col"
                  >
                    <span className="object-table__head-cell-text">
                      <Icon iconName="gear" />
                    </span>
                  </th>
                ) : (
                  <th
                    key={col}
                    className="object-table__head-cell"
                    scope="col"
                    title={col}
                  >
                    <span className="object-table__head-cell-text">{col}</span>
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody className="object-table__body">
            {data.map((row, rowIndex) => {
              const rowKey = getRowKey
                ? getRowKey(row, rowIndex)
                : String(rowIndex);

              return (
                <ObjectTableRow
                  key={rowKey}
                  row={row}
                  rowKey={rowKey}
                  columns={resolvedColumns}
                  modifyingCell={modifyingCell}
                  onStartEdit={startEdit}
                  onChangeDraft={changeDraft}
                  onToggleEdit={toggleEdit}
                  onDeleteLine={() => {
                    if (deleteLine) deleteLine(rowKey);
                  }}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
