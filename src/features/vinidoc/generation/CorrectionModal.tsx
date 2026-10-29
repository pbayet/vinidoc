import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import { CustomButton, CustomTextarea, Icon } from "@uvcdr/custom-form-system";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { useSheetLock } from "../sheets/useSheetLock";
import LimitedTextarea from "../ui/LimitedTextarea";
import { TRANSLATION_LABELS, formatDateTime, textLength } from "../lib/format";
import type {
  CheckedTag,
  Sheet,
  Template,
  TranslationField,
} from "../../../entities/vinidoc/vinidoc.types";

interface CorrectionModalProps {
  SHTID: number;
  lng: string;
  template: Template;
  /** Balises bloquantes du contrôle (texte trop long, obligatoire vide) */
  errors: CheckedTag[];
  onClose: () => void;
  /** Correction enregistrée : nouveau contrôle puis reprise de la génération */
  onCorrected: () => void;
}

/** Balise texte → champ de la fiche œnologique corrigeable ici. */
const TAG_FIELDS: Record<string, TranslationField> = {
  APPELLATION: "LIBELLE",
};

/** « DEGUST 412/350 » ou « TERROIR vide » (cf. CDC EF-53). */
const issueLabel = (t: CheckedTag) =>
  t.ISSUE === "MISSING" ? `${t.TAGNAM} vide` : `${t.TAGNAM} ${t.LENGTH}/${t.MAXLEN}`;

/**
 * Correction des textes bloquant la génération (EF-53) : chaque texte trop
 * long ou obligatoire vide pour le modèle choisi est affiché avec sa
 * longueur et la limite, et corrigé sur le moment. Aucune troncature
 * automatique : l'utilisateur réécrit le texte.
 *
 * Fiche validée : la correction est enregistrée comme une modification de
 * fiche validée (RG-01, nouvelle version tracée avec un commentaire) ;
 * sinon dans la saisie en cours. La fiche est réservée pendant la
 * correction (RG-04). Les données Sage X3 et la température ne se
 * corrigent pas ici.
 */
const CorrectionModal: React.FC<CorrectionModalProps> = ({
  SHTID,
  lng,
  template,
  errors,
  onClose,
  onCorrected,
}) => {
  const api = useVinidocApi();
  const { rights, mergeFields, colors } = useVinidoc();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<TranslationField, string>>>({});
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useSheetLock(SHTID, sheet?.LOCK);

  const isValidated = sheet?.STATUS === "VALIDATED";
  const canCorrect =
    !!sheet &&
    (isValidated
      ? rights.EDIT || rights.VALIDATE
      : rights.EDIT || (rights.VALIDATE && sheet.STATUS === "SUBMITTED"));

  // Fiche à jour (texte, ROWVER, réservation) puis réservation si autorisé.
  const { acquire } = lock;
  useEffect(() => {
    let cancelled = false;
    void api
      .getSheet(SHTID)
      .then((s) => {
        if (cancelled) return;
        setSheet(s);
        const editable =
          s.STATUS === "VALIDATED"
            ? rights.EDIT || rights.VALIDATE
            : rights.EDIT || (rights.VALIDATE && s.STATUS === "SUBMITTED");
        if (editable) void acquire();
      })
      .catch(onClose);
    return () => {
      cancelled = true;
    };
    // Une seule lecture à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Texte de chaque balise en erreur : champ de la fiche, ou non corrigeable ici. */
  const items = useMemo(
    () =>
      errors.map((tag) => {
        const field =
          TAG_FIELDS[tag.TAGNAM] ??
          mergeFields?.TEXT.find((f) => f.TAG === tag.TAGNAM)?.SHEETFIELD ??
          null;
        return { tag, field };
      }),
    [errors, mergeFields],
  );

  // Brouillons initialisés sur le texte actuel. Intitulé vide : la balise
  // APPELLATION vaut « APPELLATION - COULEUR », proposé comme point de départ.
  useEffect(() => {
    if (!sheet) return;
    const tr = sheet.TRANSLATIONS[lng];
    const color = colors.find((c) => c.COLCOD === sheet.COLCOD)?.LABELS[lng]?.LABEL ?? sheet.COLCOD;
    setDrafts(
      Object.fromEntries(
        items
          .filter((i) => i.field)
          .map(({ field }) => [
            field,
            tr?.[field!] ??
              (field === "LIBELLE" ? `${sheet.APPELL} - ${color}`.toUpperCase() : ""),
          ]),
      ),
    );
  }, [sheet, items, lng, colors]);

  const correctable = items.filter((i) => i.field);
  const others = items.filter((i) => !i.field);
  const stillKo = correctable.filter(({ tag, field }) => {
    const len = textLength(drafts[field!] ?? "");
    return (tag.REQUIRED && len === 0) || (tag.MAXLEN != null && len > tag.MAXLEN);
  });
  const canSave =
    canCorrect && lock.mine && correctable.length > 0 && stillKo.length === 0 && !saving;

  const save = async () => {
    if (!sheet || !canSave) return;
    const edits = Object.fromEntries(correctable.map(({ field }) => [field!, drafts[field!] ?? ""]));
    const summary = correctable
      .map(({ tag, field }) => `${tag.TAGNAM} ${tag.LENGTH}→${textLength(drafts[field!] ?? "")}`)
      .join(", ");
    try {
      if (isValidated) {
        await api.updateValidatedSheet(
          SHTID,
          {
            ROWVER: sheet.ROWVER,
            COMMENT:
              comment.trim() ||
              `Correction à la génération (modèle « ${template.TPLNAM} », ${lng.toUpperCase()}) : ${summary}`,
            TRANSLATIONS: { [lng]: edits },
          },
          { setLoading: setSaving, successMessage: "Textes corrigés : nouvelle version validée enregistrée." },
        );
      } else {
        const tr = sheet.TRANSLATIONS[lng];
        await api.saveTranslation(
          SHTID,
          lng,
          { ...tr, ...edits, ROWVER: sheet.ROWVER },
          { setLoading: setSaving, successMessage: "Textes corrigés." },
        );
      }
      await lock.release();
      onCorrected();
    } catch {
      /* toast déjà affiché (fiche modifiée entre-temps, réservée...) */
    }
  };

  const close = () => {
    void lock.release();
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={close}
      title="Textes à corriger avant la génération"
      size="lg"
      preventClose={saving}
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text vd-correction">
          <div className="vd-alert vd-alert--warning" role="status">
            <Icon iconName="triangle-exclamation" />
            <span>
              Le modèle <strong>« {template.TPLNAM} »</strong> refuse{" "}
              {errors.length > 1 ? "ces textes" : "ce texte"} en{" "}
              {lng.toUpperCase()} : {errors.map(issueLabel).join(", ")}. Aucun
              texte n'est tronqué automatiquement : corrigez-les ci-dessous.
            </span>
          </div>

          {!sheet && <div className="vd-empty">Chargement de la fiche…</div>}

          {sheet && lock.heldByOther && lock.lock && (
            <div className="vd-alert vd-alert--danger" role="alert">
              <Icon iconName="user-lock" />
              <span>
                <strong>{lock.lock.USRNAME}</strong> modifie cette fiche depuis
                le {formatDateTime(lock.lock.LOCKDAT)} : la correction sera
                possible après son enregistrement ou sa fermeture.
              </span>
            </div>
          )}
          {sheet && !canCorrect && (
            <div className="vd-alert vd-alert--info" role="status">
              <Icon iconName="circle-info" />
              <span>
                Vous n'avez pas le droit de modifier cette fiche : demandez la
                correction à l'œnologie (ou au marketing pour une fiche
                validée), ou choisissez un autre modèle.
              </span>
            </div>
          )}
          {sheet && canCorrect && (
            <div className="vd-alert vd-alert--info" role="status">
              <Icon iconName={isValidated ? "code-branch" : "pen"} />
              <span>
                {isValidated
                  ? `La correction sera enregistrée dans une nouvelle version validée (n°${sheet.LASTVER + 1}) de la fiche, puis la génération reprendra.`
                  : "La fiche n'est pas validée : la correction est enregistrée dans la saisie en cours, puis la génération reprend."}
              </span>
            </div>
          )}

          {sheet &&
            correctable.map(({ tag, field }) => {
              const meta = TRANSLATION_LABELS[field!];
              return (
                <LimitedTextarea
                  key={tag.TAGNAM}
                  label={`${meta.label} — ${issueLabel(tag)}${tag.REQUIRED ? " (obligatoire)" : ""}`}
                  rows={field === "LIBELLE" ? 1 : meta.rows}
                  hardMax={meta.max}
                  templateMax={tag.MAXLEN}
                  limits={[
                    {
                      TPLID: template.TPLID,
                      TPLNAM: template.TPLNAM,
                      MAXLEN: tag.MAXLEN,
                      REQUIRED: tag.REQUIRED,
                    },
                  ]}
                  readOnly={!canCorrect || !lock.mine}
                  value={drafts[field!] ?? ""}
                  onChange={(v) => setDrafts((d) => ({ ...d, [field!]: v }))}
                />
              );
            })}

          {others.length > 0 && (
            <div className="vd-alert vd-alert--danger" role="status">
              <Icon iconName="ban" />
              <span>
                Non corrigeable ici :{" "}
                {others
                  .map(({ tag }) =>
                    tag.TAGNAM.startsWith("LOG.")
                      ? `${issueLabel(tag)} (donnée Sage X3, à corriger dans l'ERP)`
                      : `${issueLabel(tag)} (à modifier dans la fiche œnologique)`,
                  )
                  .join(", ")}
                .
              </span>
            </div>
          )}

          {sheet && canCorrect && isValidated && correctable.length > 0 && (
            <CustomTextarea
              label="Commentaire de la nouvelle version (optionnel)"
              placeholder={`Correction à la génération (modèle « ${template.TPLNAM} »)`}
              rows={2}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!lock.mine}
            />
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <CustomButton size="sm" variant="neutral" onClick={close} disabled={saving}>
          Annuler
        </CustomButton>
        <CustomButton
          size="sm"
          variant="success"
          leftIcon={<Icon iconName="floppy-disk" />}
          disabled={!canSave}
          loading={saving}
          title={
            stillKo.length
              ? `Encore à corriger : ${stillKo.map((i) => i.tag.TAGNAM).join(", ")}`
              : undefined
          }
          onClick={() => void save()}
        >
          Enregistrer et générer
        </CustomButton>
      </ModalFooter>
    </Modal>
  );
};

export default CorrectionModal;
