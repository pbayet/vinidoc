import { Permission, Service, Subordinate } from "..";
import { capitalizeFirstLetter } from "../../../shared/lib/utils/string.functions";
import { Application } from "./Application.class";
import { Group } from "./Group.class";

export class User {
  readonly emailSuffix = "@union-vignerons.com";

  constructor(
    public USRID: number = 0,
    public ADID: string = "",
    public LSTNAM: string = "",
    public FSTNAM: string = "",
    public EMAIL: string = "",
    public PHNNUM: string = "",
    public USRIMG: string | null = null,
    public USRACTV: boolean = true,
    public ISEXT: boolean = false,
    public SUBORDINATES: Subordinate[] = [],
    public SERVICE: Service | null = null,
    public PERMISSIONS: Application[] = [],
    public GROUPS: Group[] = []
  ) {}

  private static mapRow(row: User): User {
    return new User(
      row.USRID,
      row.ADID,
      row.LSTNAM,
      row.FSTNAM,
      row.EMAIL,
      row.PHNNUM,
      null, // USRIMG non transmis par l'API
      row.USRACTV,
      row.ISEXT,
      Subordinate.parseToClasses(row.SUBORDINATES) ?? [],
      row.SERVICE ? Service.parseToClass(row.SERVICE) ?? null : null,
      Application.parseToClasses(row.PERMISSIONS) ?? [],
      Group.parseToClasses(row.GROUPS) ?? [],
    );
  }

  public static parseToClasses(rows: User[] | undefined): User[] | undefined {
    if (!rows || !Array.isArray(rows)) return undefined;

    return rows.map((r) => this.mapRow(r));
  }

  public static parseToClass(rows: User | undefined): User | undefined {
    if (!rows || Array.isArray(rows)) return undefined;

    return this.mapRow(rows);
  }

  get isValidLSTNAM(): { error: boolean; errorMessage: string } {
    const isValid = this.LSTNAM.trim().length > 0;
    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  get isValidFSTNAM(): { error: boolean; errorMessage: string } {
    const isValid = this.FSTNAM.trim().length > 0;
    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  isValidEMAIL(EMAILS: string[] = []): {
    error: boolean;
    errorMessage: string;
  } {
    const email = this.ISEXT
      ? this.EMAIL.trim()
      : this.EMAIL.trim().replace(/@.*/, "") + this.emailSuffix;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return {
        error: true,
        errorMessage: "Format d'email invalide",
      };
    }

    if (this.USRID >= 1) {
      if (EMAILS.filter((e) => e !== this.EMAIL).includes(this.EMAIL.trim())) {
        return {
          error: true,
          errorMessage: "Cet email est déjà utilisé",
        };
      }
    } else {
      if (EMAILS.includes(this.EMAIL.trim())) {
        return {
          error: true,
          errorMessage: "Cet email est déjà utilisé",
        };
      }
    }

    return {
      error: false,
      errorMessage: "",
    };
  }

  get isValidPOSITION(): { error: boolean; errorMessage: string } {
    const isValid =
      this.SERVICE?.POSITIONS && this.SERVICE?.POSITIONS.length > 0;
    return {
      error: !isValid,
      errorMessage: isValid ? "" : "Ce champ est obligatoire",
    };
  }

  getFullName(): string {
    // Capitaliser les prénoms et noms
    const firstName = capitalizeFirstLetter(this.FSTNAM.trim());
    const lastName = this.LSTNAM.trim().toLocaleUpperCase();

    // Retourner la mention formatée
    return `${firstName} ${lastName}`;
  }

  getFullNameReverse(): string {
    // Capitaliser les prénoms et noms
    const firstName = capitalizeFirstLetter(this.FSTNAM.trim());
    const lastName = this.LSTNAM.trim().toLocaleUpperCase();

    // Retourner la mention formatée
    return `${lastName} ${firstName}`;
  }

  // Fonction pour obtenir la mention d'utilisateur
  getMention(): string {
    // Capitaliser les prénoms et noms
    const firstName = capitalizeFirstLetter(this.FSTNAM.trim());
    const lastName = capitalizeFirstLetter(this.LSTNAM.trim());

    // Retourner la mention formatée
    return `@${firstName}${lastName}`;
  }

  getPermissionApplication(APPCOD: string): Permission | undefined | null {
    return this.PERMISSIONS.find(
      (p) => p.APPCOD === APPCOD && !p.PERMISSION?.BYGRP
    )?.PERMISSION;
  }

  get position() {
    if (this.SERVICE?.POSITIONS && this.SERVICE?.POSITIONS.length)
      return this.SERVICE?.POSITIONS[0];
  }

  /**
   * Adresse email réellement utilisable de l'utilisateur — même calcul que
   * dans `isValidEMAIL`/`hasChanged` ci-dessus (facteur commun) : un
   * utilisateur externe (`ISEXT`) porte son adresse complète telle quelle,
   * tandis qu'un utilisateur interne n'a que la partie locale en base, le
   * domaine `emailSuffix` étant implicite.
   */
  get emailAddress(): string {
    return this.ISEXT
      ? this.EMAIL.trim()
      : this.EMAIL.trim().replace(/@.*/, "") + this.emailSuffix;
  }

  /**
   * Compare l'utilisateur courant avec un autre utilisateur (original)
   * Retourne true si au moins une propriété a changé
   */
  hasChanged(original: User): boolean {
    // Comparaison des propriétés primitives
    if (
      this.USRID !== original.USRID ||
      this.ADID !== original.ADID ||
      this.LSTNAM !== original.LSTNAM ||
      this.FSTNAM !== original.FSTNAM ||
      (!this.ISEXT
        ? this.EMAIL?.replace(/@.*/, "") || ""
        : this.EMAIL || "") !==
        (!original.ISEXT
          ? original.EMAIL?.replace(/@.*/, "") || ""
          : original.EMAIL || "") ||
      this.PHNNUM !== original.PHNNUM ||
      this.USRIMG !== original.USRIMG ||
      this.USRACTV !== original.USRACTV ||
      this.ISEXT !== original.ISEXT
    ) {
      return true;
    }

    // Comparaison des tableaux d'IDs pour SUBORDINATES
    const subIdsA = this.SUBORDINATES.map((s) => s.SUBID).sort();
    const subIdsB = original.SUBORDINATES.map((s) => s.SUBID).sort();

    if (
      subIdsA.length !== subIdsB.length ||
      subIdsA.some((id, i) => id !== subIdsB[i])
    ) {
      return true;
    }

    // Comparaison des SERVICES (par SRVID)
    if ((this.SERVICE?.SRVID ?? null) !== (original.SERVICE?.SRVID ?? null)) {
      return true;
    }
    // // Comparaison des PERMISSIONS (par APPID et PERMISSION)
    // On compare les permissions individuelles (hors groupe) par APPID et PRMLVL
    const permsA = this.PERMISSIONS.filter((p) => !p.PERMISSION?.BYGRP);
    const permsB = original.PERMISSIONS.filter((p) => !p.PERMISSION?.BYGRP);

    if (permsA.length !== permsB.length) {
      return true;
    }

    // On crée des maps pour comparer plus facilement
    const mapA = new Map<number, number | null>();
    permsA.forEach((p) => {
      mapA.set(p.APPID, p.PERMISSION ? p.PERMISSION.PRMLVL : null);
    });

    const mapB = new Map<number, number | null>();
    permsB.forEach((p) => {
      mapB.set(p.APPID, p.PERMISSION ? p.PERMISSION.PRMLVL : null);
    });

    // On compare les clés et les valeurs
    for (const [appid, prmlvlA] of mapA.entries()) {
      if (!mapB.has(appid)) {
        return true;
      }
      const prmlvlB = mapB.get(appid);
      if (prmlvlA !== prmlvlB) {
        return true;
      }
    }

    // Comparaison des GROUPS (par GRPID)
    const groupA = this.GROUPS.map((g) => g.GRPID).sort();
    const groupB = original.GROUPS.map((g) => g.GRPID).sort();
    if (
      groupA.length !== groupB.length ||
      groupA.some((id, i) => id !== groupB[i])
    ) {
      return true;
    }

    // Aucun changement détecté
    return false;
  }
}
