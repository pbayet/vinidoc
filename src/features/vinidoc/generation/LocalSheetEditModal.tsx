import React, { useMemo, useRef, useState } from "react";
import {
  CustomButton,
  CustomForm,
  CustomFormSection,
  Icon,
  type CustomFormHandle,
} from "@uvcdr/custom-form-system";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import { useConfirm } from "@uvcdr/confirm-notify-system";
import CommonFormFields from "../sheets/CommonFormFields";
import TextsCard from "../sheets/TextsCard";
import {
  commonToForm,
  formToCommon,
  uppercaseCodvrac,
  validateCommonForm,
  type CommonFormValues,
} from "../sheets/commonForm";
import {
  isTextDirty,
  textFromTranslation,
  type TextDraft,
} from "../sheets/sheetDraft";
import { languageName, sheetTitle } from "../lib/format";
import { useVinidoc } from "../context/VinidocContext";
import {
  TRANSLATION_FIELDS,
  type LocalSheetChanges,
  type SheetCommon,
  type SheetSnapshot,
} from "../../../entities/vinidoc/vinidoc.types";

interface LocalSheetEditModalProps {
  /** Contenu de la fiche utilisé pour générer (sans ajustement) */
  content: SheetSnapshot;
  /** Langue générée : seuls ses textes sont ajustables */
  lng: string;
  /** Ajustements déjà appliqués (repris à l'ouverture) */
  local: LocalSheetChanges | null;
  /** Nouveaux ajustements ; null = fiche telle quelle */
  onApply: (local: LocalSheetChanges | null) => void;
  onClose: () => void;
}

const pickCommon = (s: SheetCommon): SheetCommon => ({
  CODVRAC: s.CODVRAC,
  MILLESIME: s.MILLESIME,
  APPELL: s.APPELL,
  COLCOD: s.COLCOD,
  DESCVRAC: s.DESCVRAC,
  INTARO: s.INTARO,
  INTBOU: s.INTBOU,
  ECHFRU: s.ECHFRU,
  TEMPMIN: s.TEMPMIN,
  TEMPMAX: s.TEMPMAX,
});

const sameCommon = (a: SheetCommon, b: SheetCommon) =>
  JSON.stringify(pickCommon(a)) === JSON.stringify(pickCommon(b));

/**
 * Ajustement de la fiche œnologique pour une seule génération : mêmes
 * cartes que l'édition d'une fiche (caractéristiques, textes de la langue
 * générée), mais rien n'est enregistré — la fiche reste inchangée. Les
 * ajustements sont envoyés avec la génération (et son contrôle), puis
 * oubliés au changement de vin ou de langue.
 */
const LocalSheetEditModal: React.FC<LocalSheetEditModalProps> = ({
  content,
  lng,
  local,
  onApply,
  onClose,
}) => {
  const { languages } = useVinidoc();
  const { confirm } = useConfirm();
  const formRef = useRef<CustomFormHandle<CommonFormValues>>(null);

  // Fiche d'origine (référence de « modifié ») et point de départ de la saisie.
  const originalCommon = useMemo(() => pickCommon(content), [content]);
  const originalText = useMemo(
    () => textFromTranslation(content.TRANSLATIONS[lng]),
    [content, lng],
  );
  const [initialForm] = useState(() =>
    commonToForm(local?.SHEET ?? originalCommon),
  );
  const [text, setText] = useState<TextDraft>(() =>
    textFromTranslation({ ...content.TRANSLATIONS[lng], ...local?.TRANSLATION }),
  );

  /** Saisie → ajustements (null si identique à la fiche). */
  const toChanges = (values: CommonFormValues): LocalSheetChanges | null => {
    const common = formToCommon(values);
    const SHEET = sameCommon(common, originalCommon) ? undefined : common;
    const edited = TRANSLATION_FIELDS.filter(
      (f) => text[f].trim() !== originalText[f].trim(),
    );
    const TRANSLATION = edited.length
      ? Object.fromEntries(edited.map((f) => [f, text[f]]))
      : undefined;
    return SHEET || TRANSLATION ? { SHEET, TRANSLATION } : null;
  };

  const textDirty = isTextDirty(text, originalText);

  const requestClose = async () => {
    const values = formRef.current?.getValues();
    const current = values ? toChanges(values) : null;
    if (JSON.stringify(current) !== JSON.stringify(local)) {
      const ok = await confirm({
        title: "Fermer sans appliquer ?",
        description: "Les ajustements saisis ne seront pas pris en compte.",
        type: "discardcancel",
      });
      if (!ok) return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={() => void requestClose()}
      title={`Ajuster la fiche pour cette génération — ${sheetTitle(content)}`}
      size="xl"
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text">
          <div className="vd-alert vd-alert--info" role="status">
            <Icon iconName="circle-info" />
            <span>
              <strong>Ajustements locaux.</strong> Ils ne servent qu'à la
              génération en cours : la fiche œnologique n'est pas modifiée et
              ils sont oubliés au changement de vin ou de langue. Pour corriger
              durablement, modifiez la fiche dans Œnologie.
            </span>
          </div>

          <div className="section-grid">
            <CustomForm<CommonFormValues>
              ref={formRef}
              className="section-grid--full"
              initialValues={initialForm}
              defaultValues={commonToForm(originalCommon)}
              validate={validateCommonForm}
              onChange={uppercaseCodvrac}
              onSubmit={(values) => {
                onApply(toChanges(values));
                onClose();
              }}
              inputSize="xs"
            >
              <CustomFormSection
                title="Caractéristiques"
                icon={<Icon iconName="id-card" />}
                description="Données communes : couleur, échelles, températures… (badges et intitulé du modèle)."
              >
                <CommonFormFields lockCodvrac />
              </CustomFormSection>
            </CustomForm>

            <TextsCard
              texts={{ [lng]: text }}
              onChange={(_, v) => setText(v)}
              activeLng={lng}
              onActiveLngChange={() => undefined}
              savedLngs={[lng]}
              dirtyLngs={textDirty ? [lng] : []}
              readOnly={false}
              onlyLng={lng}
              description={`Textes en ${languageName(languages, lng)}, langue de la fiche générée.`}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        {local && (
          <CustomButton
            size="xs"
            variant="danger-outline"
            leftIcon={<Icon iconName="rotate-left" />}
            title="Générer avec la fiche telle qu'enregistrée"
            onClick={() => {
              onApply(null);
              onClose();
            }}
          >
            Retirer les ajustements
          </CustomButton>
        )}
        <CustomButton
          size="xs"
          variant="neutral"
          onClick={() => void requestClose()}
        >
          Annuler
        </CustomButton>
        <CustomButton
          size="xs"
          variant="primary"
          leftIcon={<Icon iconName="check" />}
          onClick={() => void formRef.current?.submitForm()}
        >
          Appliquer à cette génération
        </CustomButton>
      </ModalFooter>
    </Modal>
  );
};

export default LocalSheetEditModal;
