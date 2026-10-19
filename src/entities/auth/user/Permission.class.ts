export class Permission {
  constructor(
    public PRMID: number = 0,
    public PRMNAM: string = "",
    public PRMDES: string = "",
    public PRMLVL: number = 0,
    public BYGRP: boolean = false,
    public ISCRIT: boolean = false,
  ) {}

  private static mapRow(row: Permission): Permission {
    return new Permission(
      row.PRMID,
      row.PRMNAM,
      row.PRMDES,
      row.PRMLVL,
      row.BYGRP,
      row.ISCRIT,
    );
  }

  public static parseToClasses(
    rows: Permission[] | undefined,
  ): Permission[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map(this.mapRow);
  }

  public static parseToClass(
    rows: Permission | undefined,
  ): Permission | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }
}
