import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useMatch, useNavigate } from "react-router-dom";
import {
  CustomButton,
  FileViewerModal,
  Icon,
  useFileViewer,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import { useWebSocket } from "../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../features/vinidoc/api/useVinidocApi";
import { useVinidoc } from "../features/vinidoc/context/VinidocContext";
import TemplateImportModal from "../features/vinidoc/templates/TemplateImportModal";
import TemplateEditModal from "../features/vinidoc/templates/TemplateEditModal";
import MergeFieldsCatalog from "../features/vinidoc/templates/MergeFieldsCatalog";
import { useTemplatePreview } from "../features/vinidoc/templates/useTemplatePreview";
import {
  templateLanguageLabel,
  toTemplateViewerFile,
} from "../features/vinidoc/templates/templateUtils";
import { formatBytes, formatDateTime } from "../features/vinidoc/lib/format";
import type { Template } from "../entities/vinidoc/vinidoc.types";

/** Route d'ajout d'un modèle (`/modeles/new`). */
export const NEW_TEMPLATE_PARAM = "new";

/**
 * Administration — modèles PowerPoint : dépôt, liste, accès au réglage des
 * longueurs max par balise, catalogue des balises disponibles.
 *
 * L'ajout et la modification s'ouvrent en modale au-dessus de la liste, en
 * conservant leur route :
 *   - `/modeles/new` → TemplateImportModal
 *   - `/modeles/:tplid`  → TemplateEditModal
 */
const ModelesPage: React.FC = () => {
  const api = useVinidocApi();
  const navigate = useNavigate();
  const { languages } = useVinidoc();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Route enfant (cf. router.tsx) : la page reste montée sous la modale.
  const tplid = useMatch("/modeles/:tplid")?.params.tplid;
  const importOpen = tplid === NEW_TEMPLATE_PARAM;
  const editId = tplid && !importOpen ? Number(tplid) : null;
  const closeModal = useCallback(() => navigate("/modeles"), [navigate]);
  const viewer = useFileViewer();
  const preview = useTemplatePreview();

  // Fichiers des modèles : navigation précédent/suivant dans la liseuse.
  const files = useMemo(
    () =>
      (templates ?? []).flatMap((t) =>
        t.FILEURL
          ? [
              {
                TPLID: t.TPLID,
                file: toTemplateViewerFile({ ...t, FILEURL: t.FILEURL }),
              },
            ]
          : [],
      ),
    [templates],
  );

  const openFile = (tplId: number) => {
    const index = files.findIndex((f) => f.TPLID === tplId);
    if (index >= 0)
      viewer.open(
        files.map((f) => f.file),
        index,
      );
  };

  const load = useCallback(async () => {
    try {
      setTemplates(await api.listTemplates({}, { setLoading }));
    } catch {
      /* toast déjà affiché */
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => void load(), [load]);
  useWebSocket("vinidoc.template.created", refresh);
  useWebSocket("vinidoc.template.updated", refresh);
  useWebSocket("vinidoc.template.deleted", refresh);

  if (editId != null && (!Number.isInteger(editId) || editId <= 0))
    return <Navigate to="/modeles" replace />;

  return (
    <PageLayout
      title="Modèles PowerPoint"
      actions={
        <CustomButton
          leftIcon={<Icon iconName="upload" />}
          variant="success"
          size="xs"
          onClick={() => navigate(`/modeles/${NEW_TEMPLATE_PARAM}`)}
        >
          Importer un modèle
        </CustomButton>
      }
    >
      <div className="section-grid">
        <CustomFormSection
          title="Modèles"
          icon={<Icon iconName="file-powerpoint" />}
          className="section-grid--full"
          description="Cliquez sur un modèle pour régler la longueur max de chaque balise, remplacer le fichier ou le désactiver."
        >
          <div className="vd-table-wrapper">
            <table className="vd-table vd-table--hover">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Langue</th>
                  <th>État</th>
                  <th className="vd-num">Balises texte</th>
                  <th>Fichier</th>
                  <th>Modifié</th>
                </tr>
              </thead>
              <tbody>
                {templates?.map((t) => (
                  <tr
                    key={t.TPLID}
                    tabIndex={0}
                    onClick={() => navigate(`/modeles/${t.TPLID}`)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && navigate(`/modeles/${t.TPLID}`)
                    }
                  >
                    <td>
                      <strong>{t.TPLNAM}</strong>
                      {t.DESCR && (
                        <div className="vd-muted vd-ellipsis">{t.DESCR}</div>
                      )}
                    </td>
                    <td>{templateLanguageLabel(languages, t.LNGCOD)}</td>
                    <td>
                      <span
                        className={`vd-chip ${t.ACTIVE ? "vd-chip--success" : "vd-chip--muted"}`}
                      >
                        {t.ACTIVE ? "Actif" : "Inactif"}
                      </span>
                      {!!t.UNKNOWNTAGS && (
                        <span
                          className="vd-chip vd-chip--warning"
                          title="Balises absentes du catalogue (rendues vides)"
                        >
                          {t.UNKNOWNTAGS} inconnue(s)
                        </span>
                      )}
                    </td>
                    <td className="vd-num">{t.TEXTTAGS ?? "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {t.FILEURL ? (
                        <button
                          type="button"
                          className="vd-link"
                          title="Ouvrir le modèle"
                          onClick={() => openFile(t.TPLID)}
                        >
                          <Icon iconName="file-powerpoint" />{" "}
                          {t.ORIGINALNAME ?? "modèle.pptx"}
                        </button>
                      ) : (
                        "—"
                      )}{" "}
                      <span className="vd-muted">
                        {formatBytes(t.SIZEBYTES)}
                      </span>
                      {t.FILEURL && (
                        <CustomButton
                          size="2xs"
                          variant="outline"
                          className="vd-preview-btn"
                          leftIcon={<Icon iconName="eye" />}
                          loading={preview.loadingId === t.TPLID}
                          title="Aperçu PDF du modèle rempli de faux texte (longueur max de chaque balise)"
                          onClick={() => void preview.open(t.TPLID)}
                        >
                          Aperçu
                        </CustomButton>
                      )}
                    </td>
                    <td className="vd-muted">
                      {formatDateTime(t.MODDAT)} — {t.MODUSR}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {templates && templates.length === 0 && (
              <div className="vd-empty">
                Aucun modèle : importez votre premier fichier .pptx.
              </div>
            )}
            {!templates && loading && (
              <div className="vd-empty">Chargement…</div>
            )}
          </div>
        </CustomFormSection>

        <MergeFieldsCatalog />
      </div>

      <TemplateImportModal
        isOpen={importOpen}
        onClose={closeModal}
        onCreated={(tpl) => {
          void load();
          navigate(`/modeles/${tpl.TPLID}`, { replace: true });
        }}
      />

      {editId != null && (
        <TemplateEditModal key={editId} TPLID={editId} onClose={closeModal} />
      )}

      {viewer.viewerProps && <FileViewerModal {...viewer.viewerProps} />}
      {preview.viewer.viewerProps && (
        <FileViewerModal {...preview.viewer.viewerProps} />
      )}
    </PageLayout>
  );
};

export default ModelesPage;
