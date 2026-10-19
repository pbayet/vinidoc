declare module "deep-diff" {
  /**
   * Types stricts pour deep-diff
   * Inspirés des types fonctionnels historiques du package.
   */

  export interface DiffAdded<T = unknown> {
    kind: "N";
    path?: Array<string | number>;
    rhs: T;
  }

  export interface DiffDeleted<T = unknown> {
    kind: "D";
    path?: Array<string | number>;
    lhs: T;
  }

  export interface DiffEdited<T = unknown> {
    kind: "E";
    path?: Array<string | number>;
    lhs: T;
    rhs: T;
  }

  export interface DiffArray<T = unknown> {
    kind: "A";
    path?: Array<string | number>;
    index: number;
    item: Diff<T>;
  }

  export type Diff<T = unknown> =
    | DiffAdded<T>
    | DiffDeleted<T>
    | DiffEdited<T>
    | DiffArray<T>;

  export function diff<L = unknown, R = unknown>(
    lhs: L,
    rhs: R
  ): Array<Diff> | undefined;

  export function applyDiff<T>(target: T, differences: Array<Diff>): void;

  export function observableDiff<L, R>(
    lhs: L,
    rhs: R,
    observer: (difference: Diff) => void
  ): void;
}
