export class Position {
  constructor(
    public POSID: number = 0,
    public POSNAM: string = "",
    public POSDES: string = "",
    public POSCOD: string = "",
    public POSLVL: number = 0,
  ) {}

  private static mapRow(row: Position): Position {
    return new Position(
      row.POSID,
      row.POSNAM,
      row.POSDES,
      row.POSCOD,
      row.POSLVL,
    );
  }

  public static parseToClasses(
    rows: Position[] | undefined,
  ): Position[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map(this.mapRow);
  }

  public static parseToClass(rows: Position | undefined): Position | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }
}
