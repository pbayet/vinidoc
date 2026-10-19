// -----------------------------------------
// Client API — délègue à @uvcdr/api-auth-system
// -----------------------------------------
// Ce module reste le point d'entrée unique utilisé par le reste de
// l'application (`apiRequest`, `apiRequestAll`, `typed`, les types
// d'erreurs...), mais l'implémentation vient désormais du package
// `@uvcdr/api-auth-system`. On y ajoute uniquement ce que le package ne
// couvre pas encore : `fileDeletings` (suppression de fichiers déclenchée
// après la requête principale).

import {
  apiRequest as packageApiRequest,
  apiRequestAll,
  typed,
  isApiError,
  isApiResult,
} from "@uvcdr/api-auth-system";
import type {
  ApiError,
  ApiHttpError,
  ApiServerError,
  ApiNetworkError,
  ApiResponseData,
  RequestOptions as PackageRequestOptions,
  ConfirmSpec as PackageConfirmSpec,
  FileUploadSpec,
  FilesParam,
} from "@uvcdr/api-auth-system";
import { DeletedFilesMeta } from "../../entities/attachment/Attachment.class";
import { ConfirmOptions } from "@uvcdr/confirm-notify-system";

export { apiRequestAll, typed, isApiError, isApiResult };
export type {
  ApiError,
  ApiHttpError,
  ApiServerError,
  ApiNetworkError,
  ApiResponseData,
  FileUploadSpec,
  FilesParam,
};

// -----------------------------------------
// CONFIRM SPEC
// -----------------------------------------

/**
 * Spécification d'une dialog de confirmation à afficher avant la requête.
 * Alias local de `ConfirmSpec` du package, typé avec les `ConfirmOptions`
 * de notre propre `ConfirmProvider` (au lieu du `unknown` générique).
 *
 * @example
 * confirms: {
 *   options: { title: "Supprimer ?", type: "deletecancel" },
 * }
 */
export type ConfirmSpec = PackageConfirmSpec<ConfirmOptions>;

// -----------------------------------------
// FILE DELETIONS (non couvert par le package)
// -----------------------------------------

type Primitive = string | number | boolean;

export interface FileDeletionSpec {
  /** Fichiers à supprimer */
  files: DeletedFilesMeta[];
  /** Endpoint de suppression. Défaut : "files/delete" */
  endpoint?: string;
  /** Params multipart de la suppression (metas…) */
  params?: Record<string, Primitive | boolean>;
}

export type RequestOptions<R = unknown> = PackageRequestOptions<
  R,
  ConfirmOptions
> & {
  /**
   * Suppressions de fichiers à déclencher APRÈS la requête principale (si succès).
   * Chaque `FileDeletionSpec` est envoyé en multipart vers son `endpoint` (défaut "files/delete").
   * Toutes les suppressions sont lancées en parallèle une fois la requête principale terminée.
   *
   * Fonctionnalité maison, non portée dans `@uvcdr/api-auth-system` : on
   * enchaîne ici un appel `apiRequest` supplémentaire par groupe de fichiers.
   */
  fileDeletings?: FileDeletionSpec[];
};

// -----------------------------------------
// API REQUEST (apiRequest du package + fileDeletings)
// -----------------------------------------

export const apiRequest = async <R = unknown,>({
  fileDeletings,
  setLoading,
  onFinally,
  ...rest
}: RequestOptions<R>): Promise<ApiResponseData<R>> => {
  const pending = fileDeletings?.filter((s) => s.files.length > 0) ?? [];

  // Cas simple : pas de suppression de fichiers → délégation directe au package.
  if (!pending.length) {
    return packageApiRequest<R, ConfirmOptions>({
      ...rest,
      setLoading,
      onFinally,
    });
  }

  // Cas avec fileDeletings : on garde `loading` actif jusqu'à la fin des
  // suppressions, comme le faisait l'ancienne implémentation locale.
  setLoading?.(true);
  try {
    const result = await packageApiRequest<R, ConfirmOptions>({ ...rest });

    await Promise.all(
      pending.map(
        ({
          files: deleteFiles,
          endpoint: upEndpoint = "files/delete",
          params: upParams,
        }) =>
          packageApiRequest({
            endpoint: upEndpoint,
            method: "DELETE",
            params: {
              ...(upParams as Record<string, Primitive>),
              metas: JSON.stringify(deleteFiles),
            },
            token: rest.token,
            isMultipart: true,
            silentError: rest.silentError,
          }),
      ),
    );

    return result;
  } finally {
    setLoading?.(false);
    onFinally?.();
  }
};
