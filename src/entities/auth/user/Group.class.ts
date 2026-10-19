import { Permission } from "..";
import { Application } from "./Application.class";

export class Group {
  constructor(
    public GRPID: number = 0,
    public GRPNAM: string = "",
    public GRPDES: string = "",
    public ACTIVE: boolean = true,
    public GRPBAS: boolean = false,
    public PERMISSIONS: Application[] = [],
  ) {}

  private static mapRow(row: Group): Group {
    return new Group(
      row.GRPID,
      row.GRPNAM,
      row.GRPDES,
      row.ACTIVE,
      row.GRPBAS,
      Application.parseToClasses(row.PERMISSIONS) ?? [],
    );
  }

  public static parseToClasses(rows: Group[] | undefined): Group[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map((r) => this.mapRow(r));
  }

  public static parseToClass(rows: Group | undefined): Group | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }

  isValidGRPNAM(GRPNAMS: string[]): { error: boolean; errorMessage: string } {
    const isValid = this.GRPNAM.trim().length > 0;

    if (this.GRPID >= 1) {
      if (
        GRPNAMS.filter((g) => g !== this.GRPNAM).includes(this.GRPNAM.trim())
      ) {
        return {
          error: true,
          errorMessage: "Ce nom est déjà utilisé",
        };
      }
    } else {
      if (GRPNAMS.includes(this.GRPNAM.trim())) {
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

  getPermissionApplication(APPNAM: string): Permission | undefined | null {
    return this.PERMISSIONS.find((p) => p.APPNAM === APPNAM)?.PERMISSION;
  }

  getHighestPermission(APPCOD: string): Permission | undefined {
    const app = this.PERMISSIONS.find((p) => p.APPCOD === APPCOD);
    if (!app) return undefined;

    return app.PERMISSION as Permission;
  }
}
