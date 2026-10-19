export class ApplicationClass {
  // Application methods and properties
  constructor(
    public ApplicationID: number,
    public ApplicationName: string,
    public Description: string,
    public ImgUrl: string | null = null,
    public Link: string,
    public Logo: string | null = null,
    public PermissionLevel: number,
    public UserDocumentationUrl: string | null = null,
  ) {}
}

export type ChangeType = "ADDED" | "UPDATED" | "FIX" | "REMOVE" | "REFACTOR";

export class VersionDetailClass {
  constructor(
    public CID: number,
    public CTYPE: ChangeType,
    public CTITLE: string,
    public CDESC: string,
  ) {}

  private static mapRow(row: VersionDetailClass): VersionDetailClass {
    return new VersionDetailClass(row.CID, row.CTYPE, row.CTITLE, row.CDESC);
  }

  public static parseToClasses(
    rows: VersionDetailClass[] | undefined,
  ): VersionDetailClass[] {
    if (!rows || !Array.isArray(rows)) return [];

    return rows.map(this.mapRow);
  }

  public static parseToClass(
    rows: VersionDetailClass | undefined,
  ): VersionDetailClass | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }

  get changesLabel(): string {
    switch (this.CTYPE) {
      case "ADDED":
        return "Les ajouts";
      case "UPDATED":
        return "Les modifications";
      case "FIX":
        return "Les corrections";
      case "REMOVE":
        return "Les suppressions";
      case "REFACTOR":
        return "Les refactorings";
    }
  }
}
export class VersionClass {
  constructor(
    public VID: number,
    public APPCOD: string,
    public VNUM: string,
    public RELEASEDTE: string,
    public SUMMARY: string | null,

    public CREATED_BY: {
      USRID: number;
      LSTNAM: string;
      FSTNAM: string;
      EMAIL: string;
    },

    public ISVIEW: boolean | null,

    public CHANGES: (VersionDetailClass | undefined)[],
  ) {}

  private static mapRow(row: VersionClass): VersionClass {
    const changes = row.CHANGES.map((c) => VersionDetailClass.parseToClass(c));

    const CREATED_BY = {
      USRID: row.CREATED_BY.USRID,
      LSTNAM: row.CREATED_BY.LSTNAM,
      FSTNAM: row.CREATED_BY.FSTNAM,
      EMAIL: row.CREATED_BY.EMAIL,
    };

    return new VersionClass(
      row.VID,
      row.APPCOD,
      row.VNUM,
      row.RELEASEDTE,
      row.SUMMARY,
      CREATED_BY,
      row.ISVIEW,
      changes,
    );
  }

  public static parseToClasses(
    rows: VersionClass[] | undefined,
  ): VersionClass[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map(this.mapRow);
  }

  public static parseToClass(
    rows: VersionClass | undefined,
  ): VersionClass | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }

  get haveNotification(): boolean {
    return !this.ISVIEW && this.CHANGES.length > 0;
  }

  set isView(value: boolean) {
    this.ISVIEW = value;
  }

  get orderedChanges(): (VersionDetailClass | undefined)[] {
    const CHANGE_TYPE_ORDER: readonly ChangeType[] = [
      "ADDED",
      "UPDATED",
      "FIX",
      "REMOVE",
      "REFACTOR",
    ];

    return this.CHANGES.filter(
      (c): c is VersionDetailClass => c !== undefined,
    ).sort((a, b) => {
      const indexA = CHANGE_TYPE_ORDER.indexOf(a.CTYPE);
      const indexB = CHANGE_TYPE_ORDER.indexOf(b.CTYPE);
      return indexA - indexB;
    });
  }
}
