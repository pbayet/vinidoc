export class Subordinate {
  constructor(
    public SUBID: number = 0,
    public SUBNAM: string = "",
    public SUBLVL: number = 0,
  ) {}

  private static mapRow(row: Subordinate): Subordinate {
    return new Subordinate(row.SUBID, row.SUBNAM, row.SUBLVL);
  }

  public static parseToClasses(
    rows: Subordinate[] | undefined,
  ): Subordinate[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;
    return rows.map((r) => this.mapRow(r));
  }

  public static parseToClass(
    row: Subordinate | undefined,
  ): Subordinate | undefined {
    if (!row || Array.isArray(row)) return undefined;
    return this.mapRow(row);
  }
}
