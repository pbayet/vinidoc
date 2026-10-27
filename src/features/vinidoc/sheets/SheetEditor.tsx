import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CustomButton,
  Icon,
  type CustomFormHandle,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import { Modal, ModalBody } from "@uvcdr/modal";
import { useConfirm } from "@uvcdr/confirm-notify-system";
import {
  useWebSocket,
  type WsMessage,
} from "../../../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import StatusBadge from "../ui/StatusBadge";
import CommentModal from "../ui/CommentModal";
import EventsTimeline from "../ui/EventsTimeline";
import CommonFieldsCard from "./CommonFieldsCard";
import TextsCard from "./TextsCard";
import TemplatesCard from "./TemplatesCard";
import VersionModal from "./VersionModal";
import { formToCommon, type CommonFormValues } from "./commonForm";
import { formatDateTime, sheetTitle } from "../lib/format";
import {
  commonFromSheet,
  emptyText,
  hasAnyText,
  isTextDirty,
  textsFromSheet,
  type TextDraft,
} from "./sheetDraft";
import type {
  Sheet,
  SheetCommon,
} from "../../../entities/vinidoc/vinidoc.types";

type WorkflowAction = "submit" | "validate" | "reject" | "delete" | null;

interface SheetEditorProps {
  SHTID: number;
  /** Fermeture de la modale (retour à la liste) */
  onClose: () => void;
}

/**
 * Consultation / édition d'une fiche œnologique (la création : SheetCreateForm), et actions du
 * workflow de validation (soumission, validation, refus, suppression).
 *
 * Affichée en modale au-dessus de la liste, ouverte par la route
 * `/oenologie/:shtid` (ou `/validation/:shtid`) — cf. SheetsList.
 *
 * Verrouillage optimiste : chaque écriture envoie le ROWVER de la fiche
 * telle qu'affichée ; si quelqu'un l'a modifiée entre-temps, l'API répond
 * 409 et l'utilisateur recharge. Après chaque écriture, la fiche est
 * relue ; seuls les brouillons de la partie enregistrée sont réinitialisés
 * (une traduction en cours dans un autre onglet n'est pas perdue).
 */
const SheetEditor: React.FC<SheetEditorProps> = ({ SHTID, onClose }) => {
  const api = useVinidocApi();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { rights, defaultLng, reloadPendingCount } = useVinidoc();

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [commonDirty, setCommonDirty] = useState(false);
  const [texts, setTexts] = useState<Record<string, TextDraft>>({});
  const [activeLng, setActiveLng] = useState(defaultLng);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<WorkflowAction>(null);
  const [versionToShow, setVersionToShow] = useState<number | null>(null);
  const [remoteChange, setRemoteChange] = useState(false);
  const commonFormRef = useRef<CustomFormHandle<CommonFormValues>>(null);

  /* ───────────────────────── Chargement ───────────────────────── */

  const applySheet = useCallback(
    (fresh: Sheet, reset: { lngs?: string[] | "all" }) => {
      setSheet(fresh);
      setRemoteChange(false);
      const serverTexts = textsFromSheet(fresh);
      if (reset.lngs === "all") setTexts(serverTexts);
      else if (reset.lngs?.length) {
        setTexts((prev) => {
          const next = { ...prev };
          for (const l of reset.lngs as string[]) {
            if (serverTexts[l]) next[l] = serverTexts[l];
            else delete next[l];
          }
          return next;
        });
      }
    },
    [],
  );

  const load = useCallback(
    async (reset: { lngs?: string[] | "all" } = { lngs: "all" }) => {
      try {
        applySheet(await api.getSheet(SHTID, { setLoading }), reset);
      } catch {
        onClose();
      }
    },
    [api, SHTID, applySheet, onClose],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Modification par un autre utilisateur : on prévient au lieu d'écraser
  // les brouillons en cours.
  const onRemote = useCallback(
    (msg: WsMessage<{ SHTID?: number }>) => {
      if (msg.payload?.SHTID === SHTID) setRemoteChange(true);
    },
    [SHTID],
  );
  useWebSocket("vinidoc.sheet.updated", onRemote);
  useWebSocket("vinidoc.sheet.submitted", onRemote);
  useWebSocket("vinidoc.sheet.validated", onRemote);
  useWebSocket("vinidoc.sheet.rejected", onRemote);

  /* ───────────────────────── États dérivés ───────────────────────── */

  // La carte Caractéristiques se réinitialise d'elle-même sur le contenu enregistré.
  const savedCommon = useMemo(
    () => (sheet ? commonFromSheet(sheet) : null),
    [sheet],
  );
  const originalTexts = useMemo(
    () => (sheet ? textsFromSheet(sheet) : {}),
    [sheet],
  );
  const savedLngs = sheet ? Object.keys(sheet.TRANSLATIONS) : [];
  const dirtyLngs = Object.keys(texts).filter(
    (l) =>
      isTextDirty(texts[l], originalTexts[l]) &&
      (savedLngs.includes(l) || hasAnyText(texts[l])),
  );
  const hasUnsaved = commonDirty || dirtyLngs.length > 0;

  const status = sheet?.STATUS;
  // Relecture marketing : le valideur corrige lui-même une fiche soumise ;
  // l'API la laisse en SUBMITTED (pas de resoumission), il valide ensuite.
  const isReviewing = rights.VALIDATE && status === "SUBMITTED";
  const canEdit = !!sheet && (rights.EDIT || isReviewing);
  const lastReject = sheet?.EVENTS.find((e) => e.EVTTYP === "REJECTED");

  // Garde-fou : quitter l'onglet avec des modifications non enregistrées.
  useEffect(() => {
    if (!hasUnsaved) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsaved]);

  /* ───────────────────────── Enregistrements ───────────────────────── */

  // Validation faite par le formulaire de la carte (CustomForm).
  const saveCommon = async (common: SheetCommon) => {
    if (!sheet) return;
    try {
      await api.updateSheet(
        sheet.SHTID,
        { ...common, ROWVER: sheet.ROWVER },
        {
          setLoading: setSaving,
          successMessage: "Caractéristiques enregistrées.",
        },
      );
      await load({});
    } catch {
      /* 409 : la fiche a changé, l'utilisateur recharge */
    }
  };

  const saveText = async (lng: string) => {
    if (!sheet) return;
    try {
      await api.saveTranslation(
        sheet.SHTID,
        lng,
        { ...texts[lng], ROWVER: sheet.ROWVER },
        {
          setLoading: setSaving,
          successMessage: `Textes ${lng.toUpperCase()} enregistrés.`,
        },
      );
      await load({ lngs: [lng] });
    } catch {
      /* toast déjà affiché */
    }
  };

  const deleteText = async (lng: string) => {
    if (!sheet) return;
    try {
      await api.deleteTranslation(sheet.SHTID, lng, sheet.ROWVER, {
        setLoading: setSaving,
        successMessage: `Traduction ${lng.toUpperCase()} supprimée.`,
      });
      await load({ lngs: [lng] });
      setActiveLng(defaultLng);
    } catch {
      /* toast déjà affiché */
    }
  };

  // Enregistrement général : caractéristiques puis chaque langue modifiée,
  // en chaînant le ROWVER renvoyé par chaque écriture.
  const saveAll = async () => {
    if (!sheet) return;
    const form = commonFormRef.current;
    if (commonDirty && form) {
      const errors = await form.validateForm();
      if (Object.values(errors).some(Boolean)) {
        // Le submit refuse le formulaire invalide et affiche les erreurs.
        await form.submitForm();
        return;
      }
    }
    const writes: ((ROWVER: string, last: boolean) => Promise<string>)[] = [];
    if (commonDirty && form) {
      const common = formToCommon(form.getValues());
      writes.push(async (ROWVER, last) => {
        const r = await api.updateSheet(
          sheet.SHTID,
          { ...common, ROWVER },
          last ? { successMessage: "Fiche enregistrée." } : undefined,
        );
        return r.ROWVER;
      });
    }
    const savedTextLngs: string[] = [];
    for (const lng of dirtyLngs) {
      const text = texts[lng];
      writes.push(async (ROWVER, last) => {
        const r = await api.saveTranslation(
          sheet.SHTID,
          lng,
          { ...text, ROWVER },
          last ? { successMessage: "Fiche enregistrée." } : undefined,
        );
        savedTextLngs.push(lng);
        return r.ROWVER;
      });
    }

    setSaving(true);
    try {
      let rowver = sheet.ROWVER;
      for (const [i, write] of writes.entries())
        rowver = await write(rowver, i === writes.length - 1);
    } catch {
      /* toast déjà affiché ; on recharge ce qui a pu être enregistré */
    } finally {
      setSaving(false);
    }
    await load({ lngs: savedTextLngs });
  };

  const runAction = async (comment: string) => {
    if (!sheet || !action) return;
    const x = { setLoading: setSaving };
    try {
      if (action === "submit") {
        await api.submitSheet(sheet.SHTID, sheet.ROWVER, comment || undefined, {
          ...x,
          successMessage: "Fiche soumise au marketing.",
        });
      } else if (action === "validate") {
        await api.validateSheet(
          sheet.SHTID,
          sheet.ROWVER,
          comment || undefined,
          { ...x, successMessage: "Fiche validée." },
        );
      } else if (action === "reject") {
        await api.rejectSheet(sheet.SHTID, sheet.ROWVER, comment, {
          ...x,
          successMessage: "Fiche refusée.",
        });
      } else if (action === "delete") {
        await api.deleteSheet(sheet.SHTID, sheet.ROWVER, comment || undefined, {
          ...x,
          successMessage: "Fiche supprimée.",
        });
        setAction(null);
        void reloadPendingCount();
        onClose();
        return;
      }
      setAction(null);
      void reloadPendingCount();
      await load({});
    } catch {
      setAction(null);
    }
  };

  const closeVersion = useCallback(() => setVersionToShow(null), []);

  /* ───────────────────────── Rendu ───────────────────────── */

  // Fermeture : confirmation si des modifications ne sont pas enregistrées.
  const requestClose = async () => {
    if (hasUnsaved) {
      const ok = await confirm({
        title: "Fermer la fiche ?",
        description: "Les modifications non enregistrées seront perdues.",
        type: "discardcancel",
      });
      if (!ok) return;
    }
    onClose();
  };

  if (loading && !sheet) {
    return (
      <Modal
        isOpen
        onClose={onClose}
        title="Fiche œnologique"
        size="xl"
        closeOnOverlayClick={false}
      >
        <ModalBody>
          <div className="vd-empty">Chargement…</div>
        </ModalBody>
      </Modal>
    );
  }

  const canDelete = rights.EDIT && !!sheet;
  const canSubmit =
    rights.EDIT && !!sheet && (status === "DRAFT" || status === "REJECTED");
  const canValidate = isReviewing;
  const saveFirstTitle = "Enregistrez ou annulez d'abord vos modifications";

  const actions = (
    <>
      {!!sheet?.LASTVER && (
        <CustomButton
          size="xs"
          variant="outline"
          leftIcon={<Icon iconName="file-powerpoint" />}
          title={`Générer une fiche technique à partir de la version validée n°${sheet.LASTVER}`}
          onClick={() => navigate(`/?sheet=${sheet.SHTID}`)}
        >
          Générer
        </CustomButton>
      )}
      {canDelete && (
        <CustomButton
          size="xs"
          variant="danger-outline"
          leftIcon={<Icon iconName="trash" />}
          onClick={() => setAction("delete")}
        >
          Supprimer
        </CustomButton>
      )}

      {canSubmit && (
        <CustomButton
          size="xs"
          variant="warning"
          leftIcon={<Icon iconName="paper-plane" />}
          disabled={hasUnsaved || saving}
          title={
            hasUnsaved
              ? "Enregistrez d'abord vos modifications"
              : "Envoyer au marketing pour validation"
          }
          onClick={() => setAction("submit")}
        >
          Soumettre au marketing
        </CustomButton>
      )}

      {canEdit && (
        <CustomButton
          size="xs"
          variant="primary"
          leftIcon={<Icon iconName="floppy-disk" />}
          disabled={!hasUnsaved || saving}
          title="Enregistrer les caractéristiques et les textes modifiés (toutes langues)"
          shortcut="Alt+S"
          bindShortcut
          onClick={() => void saveAll()}
        >
          Enregistrer
        </CustomButton>
      )}

      {canValidate && (
        <>
          <CustomButton
            size="xs"
            variant="danger"
            leftIcon={<Icon iconName="circle-xmark" />}
            disabled={saving || hasUnsaved}
            title={hasUnsaved ? saveFirstTitle : undefined}
            onClick={() => setAction("reject")}
          >
            Refuser
          </CustomButton>
          <CustomButton
            size="xs"
            variant="success"
            leftIcon={<Icon iconName="circle-check" />}
            disabled={saving || hasUnsaved}
            title={
              hasUnsaved
                ? saveFirstTitle
                : "Figer le contenu enregistré dans une nouvelle version"
            }
            onClick={() => setAction("validate")}
          >
            Valider
          </CustomButton>
        </>
      )}
    </>
  );

  return (
    <Modal
      isOpen
      onClose={() => void requestClose()}
      title={sheetTitle(sheet!)}
      size="xl"
      preventClose={saving}
      headerActions={actions}
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text">
          {sheet && (
            <div className="vd-sheet-header">
              <StatusBadge status={sheet.STATUS} lastVersion={sheet.LASTVER} />
              <span className="vd-muted">
                Modifiée le {formatDateTime(sheet.MODDAT)} par {sheet.MODUSR}
                {sheet.SUBUSR && sheet.STATUS === "SUBMITTED"
                  ? ` — soumise par ${sheet.SUBUSR} le ${formatDateTime(sheet.SUBDAT)}`
                  : ""}
              </span>
            </div>
          )}

          {remoteChange && (
            <div className="vd-alert vd-alert--warning">
              <Icon iconName="rotate" /> Cette fiche vient d'être modifiée par
              un autre utilisateur.
              <CustomButton
                size="xs"
                variant="outline"
                onClick={() => void load()}
              >
                Recharger
              </CustomButton>
            </div>
          )}
          {status === "REJECTED" && lastReject && (
            <div className="vd-alert vd-alert--danger">
              <Icon iconName="circle-xmark" />
              <div>
                <strong>Refusée par {lastReject.EVTUSR}</strong> le{" "}
                {formatDateTime(lastReject.EVTDAT)}
                {lastReject.COMMENT && <div>Motif : {lastReject.COMMENT}</div>}
              </div>
            </div>
          )}
          {status === "SUBMITTED" && rights.VALIDATE && (
            <div className="vd-alert vd-alert--info">
              <Icon iconName="clipboard-check" /> Relisez les caractéristiques
              et les textes dans chaque langue. Vous pouvez les corriger
              directement : vos modifications sont enregistrées sans renvoyer la
              fiche à l'œnologie. Validez ensuite (ou refusez) la fiche — la
              validation porte sur la fiche entière, toutes langues confondues.
            </div>
          )}
          {status === "SUBMITTED" && rights.EDIT && !rights.VALIDATE && (
            <div className="vd-alert vd-alert--info">
              <Icon iconName="hourglass-half" /> En attente de validation
              marketing. Toute modification annule la soumission et repasse la
              fiche en brouillon.
            </div>
          )}
          {!!sheet?.LASTVER && sheet.STATUS !== "VALIDATED" && (
            <div className="vd-alert vd-alert--info">
              <Icon iconName="circle-info" /> La version validée n°
              {sheet.LASTVER} reste utilisée pour générer les fiches techniques
              tant que ces modifications ne sont pas validées.
            </div>
          )}

          <div className="section-grid">
            {savedCommon && (
              <CommonFieldsCard
                value={savedCommon}
                readOnly={!canEdit}
                onSave={saveCommon}
                onDirtyChange={setCommonDirty}
                formRef={commonFormRef}
              />
            )}

            <TextsCard
              texts={texts}
              onChange={(lng, v) => setTexts((prev) => ({ ...prev, [lng]: v }))}
              activeLng={activeLng}
              onActiveLngChange={setActiveLng}
              savedLngs={savedLngs}
              dirtyLngs={dirtyLngs}
              readOnly={!canEdit}
              saving={saving}
              onSave={(lng) => void saveText(lng)}
              onReset={(lng) =>
                setTexts((prev) => ({
                  ...prev,
                  [lng]: originalTexts[lng] ?? emptyText(),
                }))
              }
              onDelete={(lng) => void deleteText(lng)}
              onCopyFrom={(from, to) =>
                setTexts((prev) => ({
                  ...prev,
                  [to]: { ...(prev[from] ?? emptyText()) },
                }))
              }
            />

            {sheet && (
              <>
                <TemplatesCard
                  sheet={sheet}
                  lng={activeLng}
                  canEdit={rights.EDIT || rights.VALIDATE}
                  hasUnsavedChanges={hasUnsaved}
                  onSaved={() => void load({})}
                />

                <CustomFormSection
                  title="Versions validées"
                  icon={<Icon iconName="code-branch" />}
                  description="Contenus figés à chaque validation marketing ; la plus récente sert à la génération."
                >
                  {sheet.VERSIONS.length === 0 ? (
                    <p className="vd-muted">
                      Aucune version validée pour l'instant.
                    </p>
                  ) : (
                    <ul className="vd-versions">
                      {sheet.VERSIONS.map((v) => (
                        <li key={v.VERNUM}>
                          <span className="vd-chip vd-chip--success">
                            v{v.VERNUM}
                          </span>
                          <span>
                            {formatDateTime(v.VALDAT)} — {v.VALUSR}
                          </span>
                          <CustomButton
                            size="2xs"
                            variant="ghost"
                            leftIcon={<Icon iconName="eye" />}
                            onClick={() => setVersionToShow(v.VERNUM)}
                          >
                            Voir
                          </CustomButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </CustomFormSection>

                <CustomFormSection
                  title="Historique"
                  icon={<Icon iconName="clock-rotate-left" />}
                  className="section-grid--full"
                >
                  <EventsTimeline events={sheet.EVENTS} />
                </CustomFormSection>
              </>
            )}
          </div>

          {sheet && (
            <VersionModal
              SHTID={sheet.SHTID}
              VERNUM={versionToShow}
              onClose={closeVersion}
            />
          )}

          <CommentModal
            isOpen={action === "submit"}
            title="Soumettre au marketing"
            message="La fiche (toutes langues) sera envoyée au marketing pour validation. Un mail lui est adressé."
            confirmLabel="Soumettre"
            confirmIcon="paper-plane"
            loading={saving}
            onConfirm={runAction}
            onClose={() => setAction(null)}
          />
          <CommentModal
            isOpen={action === "validate"}
            title="Valider la fiche"
            message="Le contenu actuel (toutes langues) sera figé dans une nouvelle version et utilisé pour générer les fiches techniques."
            confirmLabel="Valider"
            confirmIcon="circle-check"
            variant="success"
            loading={saving}
            onConfirm={runAction}
            onClose={() => setAction(null)}
          />
          <CommentModal
            isOpen={action === "reject"}
            title="Refuser la fiche"
            message="Indiquez ce qui doit être corrigé : le motif est transmis à l'œnologie."
            label="Motif du refus"
            required
            confirmLabel="Refuser"
            confirmIcon="circle-xmark"
            variant="danger"
            loading={saving}
            onConfirm={runAction}
            onClose={() => setAction(null)}
          />
          <CommentModal
            isOpen={action === "delete"}
            title="Supprimer la fiche"
            message="La fiche ne sera plus proposée, ni en saisie ni en génération. Son historique est conservé."
            confirmLabel="Supprimer"
            confirmIcon="trash"
            variant="danger"
            loading={saving}
            onConfirm={runAction}
            onClose={() => setAction(null)}
          />
        </div>
      </ModalBody>
    </Modal>
  );
};

export default SheetEditor;
