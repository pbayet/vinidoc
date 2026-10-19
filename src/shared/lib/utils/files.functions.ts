import { apiRequest } from "../../../app/api/api";
import { APP_CODE } from "../../../app/config";
import {
  Attachment,
  DeletedFilesMeta,
  FilesMeta,
} from "../../../entities/attachment/Attachment.class";
import { APIFilesResult } from "../types/types";

export const uploadFiles = async (
  files: File[],
  meta: FilesMeta,
  token: string | undefined,
) => {
  return await apiRequest<Attachment[]>({
    endpoint: "files/upload",
    method: "POST",
    params: {
      appcode: APP_CODE,
      files,
      entityid: meta.entityid,
      entitytyp: meta.entitytyp,
      ignoreIfExist: meta.ignoreIfExist || false,
    },
    token,
    isMultipart: true,
  });
};

export const deleteFiles = async (
  meta: DeletedFilesMeta[],
  token: string | undefined,
) => {
  return await apiRequest<APIFilesResult[]>({
    endpoint: "files/delete",
    method: "DELETE",
    params: {
      metas: JSON.stringify(meta),
    },
    token,
    isMultipart: true,
  });
};

export type UrlCheckResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; error?: string };

export const checkUrlExists = async (
  url: string,
  options?: {
    timeoutMs?: number;
    method?: "HEAD" | "GET";
  },
): Promise<UrlCheckResult> => {
  const { timeoutMs = 5000, method = "HEAD" } = options ?? {};

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      // Important pour éviter certains caches agressifs
      cache: "no-store",
    });

    window.clearTimeout(timeoutId);

    return {
      ok: response.ok,
      status: response.status,
    };
  } catch (error: unknown) {
    window.clearTimeout(timeoutId);

    if (error instanceof Error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    return {
      ok: false,
      error: "Unknown error",
    };
  }
};

/**
 * Formate une taille en octets vers une unité lisible (Ko, Mo, Go...).
 */
export function formatFileSize(sizeBytes?: number): string {
  if (sizeBytes === undefined || sizeBytes === null || Number.isNaN(sizeBytes))
    return "";

  if (sizeBytes < 1024) return `${sizeBytes} o`;

  const units = ["Ko", "Mo", "Go", "To"];
  let value = sizeBytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

export function downloadCsvFile(
  csvContent: string,
  filename = "export.csv",
): void {
  const normalizedFilename = filename.endsWith(".csv")
    ? filename
    : `${filename}.csv`;

  const blob = new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = normalizedFilename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
