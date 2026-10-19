import { FileUrlWithName } from "@uvcdr/custom-form-system";
import { UPLOADS_URL } from "../../app/config";
import { formatDate } from "../../shared/lib/utils/date.functions";

export type FilesMeta = {
  entityid: string;
  entitytyp: string;
  ignoreIfExist?: boolean;
};

type DeletedEntity = {
  entityName?: string;
  entityId?: string;
};

export type DeletedFilesMeta = {
  filecode?: string;
  entity?: DeletedEntity;
};

type DeleteTarget = "CURRENT_FILE" | "ENTITY_FILES";

export class Attachment {
  constructor(
    public ID: number = 0,
    public FILECODE: string = "",
    public APPCODE: string = "",
    public ENTITYTYPE?: string,
    public ENTITYID?: string,
    public ORIGINALNAME: string = "",
    public STOREDNAME: string = "",
    public RELATIVEPATH: string = "",
    public MIMETYPE: string = "",
    public EXTENSION: string = "",
    public COMPRESSED: boolean = false,
    public ORIGINALSIZEBYTES: number = 0,
    public SIZEBYTES: number = 0,
    public STATUS: string = "",
    public UPLOADEDBY?: string,
    public CREATEDAT: Date = new Date(),
    public DELETEDAT?: Date,
    public file?: File,
  ) {}

  private static mapRow(row: Attachment): Attachment {
    return new Attachment(
      row.ID,
      row.FILECODE,
      row.APPCODE,
      row.ENTITYTYPE,
      row.ENTITYID,
      row.ORIGINALNAME,
      row.STOREDNAME,
      row.RELATIVEPATH,
      row.MIMETYPE,
      row.EXTENSION,
      row.COMPRESSED,
      row.ORIGINALSIZEBYTES,
      row.SIZEBYTES,
      row.STATUS,
      row.UPLOADEDBY,
      formatDate(row.CREATEDAT, "obj-date"),
      formatDate(row.DELETEDAT, "obj-date"),
      row.file,
    );
  }

  public static parseToClasses(
    rows: Attachment[] | undefined,
  ): Attachment[] | undefined {
    if (!rows || !Array.isArray(rows)) {
      return undefined;
    }

    return rows.map((row) => this.mapRow(row));
  }

  public static parseToClass(
    row: Attachment | undefined,
  ): Attachment | undefined {
    if (!row || Array.isArray(row)) {
      return undefined;
    }

    return this.mapRow(row);
  }

  public static fromFile(file: File, newId: number = 0): Attachment {
    const extension = file.name.split(".").pop() ?? "";
    const attachment = new Attachment(
      newId,
      "",
      "",
      undefined,
      undefined,
      file.name,
      "",
      "",
      file.type,
      extension,
      false,
      file.size,
      file.size,
      "PENDING",
      undefined,
      new Date(),
      undefined,
      file,
    );

    return attachment;
  }

  public get ABSOLUTEURL(): string | undefined {
    return `${UPLOADS_URL}/${this.RELATIVEPATH}`;
  }

  // Fallback : certains fichiers arrivent avec un MIMETYPE vide ou générique
  // ("application/octet-stream") en base, ce qui empêche FileViewerModal de
  // détecter correctement le type (il se base uniquement sur le MIME, pas sur
  // l'extension pour les images). On complète via l'extension du fichier.
  private static readonly EXTENSION_MIME_MAP: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    csv: "text/csv",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    txt: "text/plain",
    json: "application/json",
    xml: "application/xml",
  };

  get resolveExtension(): string {
    return (
      this.EXTENSION ||
      this.ORIGINALNAME.split(".").pop() ||
      this.ABSOLUTEURL?.split(".").pop() ||
      ""
    ).toLowerCase();
  }

  get resolveMimeType(): string {
    if (this.MIMETYPE && this.MIMETYPE !== "application/octet-stream") {
      return this.MIMETYPE;
    }

    const ext = this.resolveExtension;

    return Attachment.EXTENSION_MIME_MAP[ext] ?? this.MIMETYPE ?? "";
  }

  /**
   * Retourne une URL exploitable pour affichage direct.
   * - si on a un vrai File => URL blob locale
   * - sinon on utilise le chemin relatif
   */
  public get previewSrc(): string | undefined {
    if (this.file) {
      return URL.createObjectURL(this.file);
    }

    if (this.RELATIVEPATH) {
      return this.RELATIVEPATH;
    }

    return undefined;
  }

  /**
   * Charge un vrai objet File depuis RELATIVEPATH si besoin.
   * Utile si tu dois manipuler le contenu comme un File.
   */
  public async loadFile(): Promise<File | undefined> {
    if (this.file) {
      return this.file;
    }

    if (!this.ABSOLUTEURL) {
      return undefined;
    }

    const response: Response = await fetch(this.ABSOLUTEURL);

    if (!response.ok) {
      throw new Error(`Impossible de charger le fichier: ${this.ABSOLUTEURL}`);
    }

    const blob: Blob = await response.blob();

    const fileName: string =
      this.ORIGINALNAME || this.STOREDNAME || "attachment";

    const fileType: string =
      this.MIMETYPE || blob.type || "application/octet-stream";

    const loadedFile: File = new File([blob], fileName, {
      type: fileType,
      lastModified: Date.now(),
    });

    this.file = loadedFile;

    return loadedFile;
  }

  public get VALID(): boolean {
    return this.ID > 0 && this.FILECODE.trim().length > 0;
  }

  public static isFile(value: File | Attachment | undefined): value is File {
    return value instanceof File;
  }

  public static async formatFiles(
    value: readonly File[] | readonly Attachment[] | (File | Attachment)[],
  ): Promise<File[]> {
    const files = await Promise.all(
      value.map(async (item): Promise<File | undefined> => {
        if (item instanceof File) {
          return item;
        }

        return item.loadFile();
      }),
    );

    return files.filter(this.isFile);
  }

  /**
   * Normalise un ou plusieurs File/Attachment en Attachment(s).
   * - un File est converti via `fromFile`
   * - un Attachment est renvoyé tel quel
   * - la forme (tableau ou valeur unique) de l'entrée est conservée en sortie
   */
  public static from(value: File | Attachment): Attachment;
  public static from(value: File[] | Attachment[]): Attachment[];
  public static from(
    value: File | File[] | Attachment | Attachment[] | undefined,
  ): Attachment | Attachment[] | undefined {
    if (Array.isArray(value)) {
      return value.map((item) =>
        item instanceof File ? Attachment.fromFile(item) : item,
      );
    }

    return value instanceof File ? Attachment.fromFile(value) : value;
  }

  public static toFileUrlWithName(value: File | Attachment): FileUrlWithName {
    if (value instanceof File) {
      return { url: URL.createObjectURL(value), name: value.name };
    }
    return {
      url: value.ABSOLUTEURL || "",
      name: value.ORIGINALNAME,
    } as FileUrlWithName;
  }

  public toFileUrlWithName(): FileUrlWithName {
    if (this instanceof File) {
      return { url: this.ABSOLUTEURL || "", name: this.name };
    }

    return {
      url: this.ABSOLUTEURL ?? "",
      name: this.ORIGINALNAME,
    } as FileUrlWithName;
  }

  public deletedFilesMeta(target: DeleteTarget): DeletedFilesMeta {
    switch (target) {
      case "CURRENT_FILE":
        return {
          filecode: this.FILECODE,
        };

      case "ENTITY_FILES":
        return {
          entity: {
            entityName: this.ENTITYTYPE,
            entityId: this.ENTITYID,
          },
        };
    }
  }

  get extentionIcon(): string {
    const ext = this.EXTENSION.toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext))
      return "file-image";
    if (ext === "pdf") return "file-pdf";
    if (["doc", "docx"].includes(ext)) return "file-word";
    if (["xls", "xlsx", "csv"].includes(ext)) return "file-excel";
    if (["ppt", "pptx"].includes(ext)) return "file-powerpoint";
    if (["zip", "rar", "7z"].includes(ext)) return "file-zip";
    if (ext === "txt") return "file-lines";
    return "file";
  }
}

export const attachmentMock: Attachment = new Attachment(
  -100,
  "01KKBQJAVGMBCW37WTP2V6JRM6",
  "TST",
  "test",
  "test-01",
  "MOCKEDNAME.png",
  "01KKBQJAVGMBCW37WTP2V6JRM6.png",
  "USRMAN/2026/03/10/01/01KKBQJAVGMBCW37WTP2V6JRM6.png",
  "image/png",
  "png",
  false,
  406477,
  406477,
  "SUBMITTED",
  "me",
  new Date("2026-03-10T12:19:28.396Z"),
  undefined,
);
