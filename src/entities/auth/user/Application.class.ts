import { Permission } from "..";

export class Application {
  constructor(
    public APPID: number = 0,
    public APPCOD: string = "",
    public APPNAM: string = "",
    public APPDES: string = "",
    public LOGLNK: string = "",
    public APPLNK: string = "[DOMAIN]/",
    public DOCLNK: string = "",
    public IMGLNK: string = "",
    public ACTIVE: boolean = true,
    public PERMISSION: Permission | null = null,
  ) {}

  private static mapRow(row: Application): Application {
    return new Application(
      row.APPID,
      row.APPCOD,
      row.APPNAM,
      row.APPDES,
      row.LOGLNK,
      row.APPLNK,
      row.DOCLNK,
      row.IMGLNK,
      row.ACTIVE,
      Permission.parseToClass(row.PERMISSION || new Permission()),
    );
  }

  public static parseToClasses(
    rows: Application[] | undefined,
  ): Application[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map(this.mapRow);
  }

  public static parseToClass(
    rows: Application | undefined,
  ): Application | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }

  isValidAPPNAM(APPNAMS: string[]): { error: boolean; errorMessage: string } {
    const isValid = this.APPNAM.trim().length > 0;

    if (this.APPID >= 1) {
      if (
        APPNAMS.filter((a) => a !== this.APPNAM).includes(this.APPNAM.trim())
      ) {
        return {
          error: true,
          errorMessage: "Ce nom est déjà utilisé",
        };
      }
    } else {
      if (APPNAMS.includes(this.APPNAM.trim())) {
        return {
          error: true,
          errorMessage: "Ce nom est déjà utilisé",
        };
      }
    }

    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  isValidAPPCOD(APPCODS: string[]): { error: boolean; errorMessage: string } {
    const isValid = this.APPCOD.trim().length > 0;

    if (this.APPID >= 1) {
      if (
        APPCODS.filter((a) => a !== this.APPCOD).includes(this.APPCOD.trim())
      ) {
        return {
          error: true,
          errorMessage: "Ce code est déjà utilisé",
        };
      }
    } else {
      if (APPCODS.includes(this.APPCOD.trim())) {
        return {
          error: true,
          errorMessage: "Ce code est déjà utilisé",
        };
      }
    }

    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  isValidAPPLNK(APPLNKS: string[]): { error: boolean; errorMessage: string } {
    const isValid = this.APPLNK.trim().length > 0;

    if (this.APPID >= 1) {
      if (
        APPLNKS.filter((a) => a !== this.APPLNK).includes(this.APPLNK.trim())
      ) {
        return {
          error: true,
          errorMessage: "Ce lien est déjà utilisé",
        };
      }
    } else {
      if (APPLNKS.includes(this.APPLNK.trim())) {
        return {
          error: true,
          errorMessage: "Ce lien est déjà utilisé",
        };
      }
    }

    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  hasChanged(constSelectedApplication: Application): boolean {
    return (
      this.APPID !== constSelectedApplication.APPID ||
      this.APPCOD !== constSelectedApplication.APPCOD ||
      this.APPNAM !== constSelectedApplication.APPNAM ||
      this.APPDES !== constSelectedApplication.APPDES ||
      this.LOGLNK !== constSelectedApplication.LOGLNK ||
      this.APPLNK !== constSelectedApplication.APPLNK ||
      this.DOCLNK !== constSelectedApplication.DOCLNK ||
      this.IMGLNK !== constSelectedApplication.IMGLNK ||
      this.ACTIVE !== constSelectedApplication.ACTIVE ||
      this.PERMISSION !== constSelectedApplication.PERMISSION
    );
  }
}
