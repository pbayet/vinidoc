import { Position } from "..";

export class Service {
  constructor(
    public SRVID: number = 0,
    public SRVNAM: string = "",
    public SRVDES: string = "",
    public POSITIONS: Position[] = [],
  ) {}

  private static mapRow(row: Service): Service {
    return new Service(
      row.SRVID,
      row.SRVNAM,
      row.SRVDES,
      Position.parseToClasses(row.POSITIONS) ?? [],
    );
  }

  public static parseToClasses(
    rows: Service[] | undefined,
  ): Service[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;
    return rows.map((r) => this.mapRow(r));
  }

  public static parseToClass(row: Service | undefined): Service | undefined {
    if (!row || Array.isArray(row)) return undefined;
    return this.mapRow(row);
  }
}
