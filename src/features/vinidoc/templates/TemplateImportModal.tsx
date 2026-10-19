import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import {
  CustomButton,
  CustomInput,
  CustomInputFile,
  CustomSelect,
  CustomTextarea,
  Icon,
} from "@uvcdr/custom-form-system";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import { languageOptions } from "./templateUtils";
import { useTemplateInspection } from "./useTemplateInspection";
import TemplateInspectionView from "./TemplateInspectionView";
import type { Template } from "../../../entities/vinidoc/vinidoc.types";

interface TemplateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (template: Template) => void;
}

export const PPTX_MAX_SIZE = 30 * 1024 * 1024;

/**
 * Dépôt d'un nouveau modèle PowerPoint. Les balises sont analysées par l'API
 * dès le choix du fichier (inconnues / absentes du catalogue), avant l'import.
 */
const TemplateImportModal: React.FC<TemplateImportModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const api = useVinidocApi();
  const { languages } = useVinidoc();

  const [name, setName] = useState("");
  const [descr, setDescr] = useState("");
  const [lng, setLng] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const inspection = useTemplateInspection(file);

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setDescr("");
    setLng("");
    setFile(null);
  }, [isOpen]);

  const submit = async () => {
    if (!file) return;
    try {
      const tpl = await api.createTemplate(
        {
          TPLNAM: name.trim(),
          DESCR: descr.trim() || null,
          LNGCOD: lng || null,
        },
        file,
        { setLoading: setSaving, successMessage: "Modèle importé." },
      );
      onCreated(tpl);
    } catch {
      /* toast déjà affiché */
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importer un modèle PowerPoint"
      size="md"
      preventClose={saving}
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text vd-stack">
          <CustomInput
            label="Nom du modèle"
            required
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
            inputSize="xs"
          />
          <CustomTextarea
            label="Description"
            value={descr}
            rows={2}
            maxLength={1000}
            onChange={(e) => setDescr(e.target.value)}
            inputSize="xs"
          />
          <CustomSelect
            label="Langue"
            placeholder="Toutes les langues"
            options={languageOptions(languages)}
            value={lng}
            onChange={setLng}
            inputSize="xs"
          />
          <p className="vd-muted">
            Laissez « Toutes les langues » si le modèle ne contient aucun texte
            fixe ; sinon choisissez la langue de ses libellés.
          </p>
          <CustomInputFile
            label="Fichier .pptx"
            accept=".pptx"
            required
            maxFileSize={PPTX_MAX_SIZE}
            onChange={(files) => setFile(files[0] ?? null)}
            onClear={() => setFile(null)}
            inputSize="xs"
          />
          <TemplateInspectionView state={inspection} />
        </div>
      </ModalBody>
      <ModalFooter>
        <CustomButton
          variant="neutral"
          onClick={onClose}
          disabled={saving}
          size="xs"
        >
          Annuler
        </CustomButton>
        <CustomButton
          variant="success"
          leftIcon={<Icon iconName="upload" />}
          loading={saving}
          disabled={
            !file ||
            !name.trim() ||
            saving ||
            inspection.loading ||
            inspection.failed
          }
          onClick={() => void submit()}
          size="xs"
        >
          Importer
        </CustomButton>
      </ModalFooter>
    </Modal>
  );
};

export default TemplateImportModal;
