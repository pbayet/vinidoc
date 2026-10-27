import React from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import CheckReportView from "../ui/CheckReportView";
import { useVinidoc } from "../context/VinidocContext";
import { languageName } from "../lib/format";
import type { CheckReport } from "../../../entities/vinidoc/vinidoc.types";

interface CheckReportModalProps {
  /** Rapport à afficher ; null = modale fermée */
  report: CheckReport | null;
  /** Portée du contrôle (nom du modèle, ou « Tous les modèles actifs ») */
  scopeLabel: string;
  /** Le contrôle a porté sur l'enregistré alors que des modifications sont en cours */
  hasUnsavedChanges: boolean;
  onClose: () => void;
}

/** Rapport du contrôle des textes face aux modèles PowerPoint. */
const CheckReportModal: React.FC<CheckReportModalProps> = ({
  report,
  scopeLabel,
  hasUnsavedChanges,
  onClose,
}) => {
  const { languages } = useVinidoc();

  return (
    <Modal
      isOpen={report != null}
      onClose={onClose}
      title="Contrôle des modèles"
      size="lg"
    >
      <ModalBody>
        <div className="vd-dark-text">
          {report && (
            <>
              <p className="vd-muted">
                {scopeLabel} — textes enregistrés en{" "}
                {languageName(languages, report.LNGCOD)}
              </p>
              {hasUnsavedChanges && (
                <div className="vd-alert vd-alert--warning">
                  <Icon iconName="triangle-exclamation" /> Des modifications ne
                  sont pas enregistrées : le contrôle porte sur la dernière
                  version enregistrée.
                </div>
              )}
              <CheckReportView report={report} />
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <CustomButton variant="neutral" onClick={onClose} size="xs">
          Fermer
        </CustomButton>
      </ModalFooter>
    </Modal>
  );
};

export default CheckReportModal;
