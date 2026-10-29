import React from "react";
import {
  CustomButton,
  Icon,
  CustomFormSection,
} from "@uvcdr/custom-form-system";
import LanguageTabs from "../ui/LanguageTabs";
import LimitedTextarea from "../ui/LimitedTextarea";
import { useVinidoc } from "../context/VinidocContext";
import { TRANSLATION_LABELS, languageName } from "../lib/format";
import { TRANSLATION_FIELDS } from "../../../entities/vinidoc/vinidoc.types";
import { emptyText, type TextDraft } from "./sheetDraft";

interface TextsCardProps {
  texts: Record<string, TextDraft>;
  onChange: (lng: string, value: TextDraft) => void;
  activeLng: string;
  onActiveLngChange: (lng: string) => void;
  /** Langues déjà enregistrées côté serveur */
  savedLngs: string[];
  dirtyLngs: string[];
  readOnly: boolean;
  saving?: boolean;
  /** Langues proposées (en création : la langue par défaut uniquement) */
  onlyLng?: string;
  onSave?: (lng: string) => void;
  onReset?: (lng: string) => void;
  onDelete?: (lng: string) => void;
  /** Recopie les textes d'une autre langue comme base de traduction */
  onCopyFrom?: (from: string, to: string) => void;
  /** Remplace la description par défaut (création / édition) */
  description?: string;
}

/**
 * Textes traduisibles, un onglet par langue. Chaque champ affiche son
 * compteur face à la longueur max la plus stricte des modèles actifs.
 */
const TextsCard: React.FC<TextsCardProps> = ({
  texts,
  onChange,
  activeLng,
  onActiveLngChange,
  savedLngs,
  dirtyLngs,
  readOnly,
  saving = false,
  onlyLng,
  onSave,
  onReset,
  onDelete,
  onCopyFrom,
  description,
}) => {
  const { languages, defaultLng, mergeFields } = useVinidoc();
  const visibleLanguages = onlyLng
    ? languages.filter((l) => l.LNGCOD === onlyLng)
    : languages;
  const current = texts[activeLng] ?? emptyText();
  const isSaved = savedLngs.includes(activeLng);
  const isDirty = dirtyLngs.includes(activeLng);
  const copySource =
    savedLngs.includes(defaultLng) && activeLng !== defaultLng
      ? defaultLng
      : null;

  // Balise de modèle alimentée par ce champ de traduction (cf. TEXT_FIELDS
  // côté API) : les champs sans balise (garde, accords...) n'ont pas de limite.
  const limitOf = (field: string) =>
    mergeFields?.TEXT.find((f) => f.SHEETFIELD === field);

  return (
    <CustomFormSection
      title="Textes"
      icon={<Icon iconName="language" />}
      className="section-grid--full"
      description={
        description ??
        (onlyLng
          ? `Textes en ${languageName(languages, onlyLng)} (langue de référence). Les traductions pourront être ajoutées après la création.`
          : "Cépages, terroir, vinification, dégustation, garde et accords — une version par langue. La langue de référence (★) est obligatoire pour soumettre la fiche.")
      }
    >
      {visibleLanguages.length > 1 && (
        <LanguageTabs
          languages={visibleLanguages}
          active={activeLng}
          onChange={onActiveLngChange}
          present={savedLngs}
          dirty={dirtyLngs}
        />
      )}

      {!readOnly && !isSaved && !isDirty && copySource && onCopyFrom && (
        <div className="vd-alert vd-alert--info">
          <Icon iconName="circle-info" /> Pas encore de texte en{" "}
          {languageName(languages, activeLng)}.
          <CustomButton
            size="xs"
            variant="outline"
            leftIcon={<Icon iconName="copy" />}
            onClick={() => onCopyFrom(copySource, activeLng)}
          >
            Partir du texte {copySource.toUpperCase()}
          </CustomButton>
        </div>
      )}

      <div className="vd-texts">
        {TRANSLATION_FIELDS.map((f) => {
          const meta = TRANSLATION_LABELS[f];
          const limit = limitOf(f);
          return (
            <LimitedTextarea
              key={`${activeLng}-${f}`}
              label={meta.label}
              rows={meta.rows}
              hardMax={meta.max}
              hint={meta.hint}
              templateMax={limit?.MAXLEN}
              limits={limit?.LIMITS}
              readOnly={readOnly}
              value={current[f]}
              onChange={(v) => onChange(activeLng, { ...current, [f]: v })}
            />
          );
        })}
      </div>
      {!readOnly && onSave && (
        <div className="vd-section-actions">
          {isSaved && activeLng !== defaultLng && onDelete && (
            <CustomButton
              size="xs"
              variant="danger-ghost"
              leftIcon={<Icon iconName="trash" />}
              disabled={saving}
              onClick={() => onDelete(activeLng)}
            >
              Supprimer la langue
            </CustomButton>
          )}
          {isDirty && onReset && (
            <CustomButton
              shortcut="Mod+Z"
              bindShortcut
              size="xs"
              variant="danger-outline"
              leftIcon={<Icon iconName="rotate-left" />}
              onClick={() => onReset(activeLng)}
              disabled={saving}
            >
              Annuler
            </CustomButton>
          )}
          <CustomButton
            size="xs"
            variant="primary"
            leftIcon={<Icon iconName="floppy-disk" />}
            disabled={!isDirty || saving}
            loading={saving}
            onClick={() => onSave(activeLng)}
          >
            Enregistrer ({activeLng.toUpperCase()})
          </CustomButton>
        </div>
      )}
    </CustomFormSection>
  );
};

export default TextsCard;
