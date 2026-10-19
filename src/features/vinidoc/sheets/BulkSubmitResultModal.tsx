import React from "react";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import { CustomButton } from "@uvcdr/custom-form-system";
import type { BulkSubmitResult } from "../../../entities/vinidoc/vinidoc.types";

interface BulkSubmitResultModalProps {
  result: BulkSubmitResult | null;
  onClose: () => void;
  /** Ouvre une fiche non soumise pour la corriger */
  onOpenSheet: (SHTID: number) => void;
}

const sheetLabel = (s: { CODVRAC: string; MILLESIME: number | null }) =>
  [s.CODVRAC, s.MILLESIME].filter(Boolean).join(" — ");

/** Compte rendu de la soumission en masse : fiches soumises et fiches écartées. */
const BulkSubmitResultModal: React.FC<BulkSubmitResultModalProps> = ({
  result,
  onClose,
  onOpenSheet,
}) => (
  <Modal isOpen={!!result} onClose={onClose} title="Soumission au marketing" size="lg">
    <ModalBody>
      {result && (
        <div className="vd-dark-text vd-stack">
          {result.SUBMITTED.length === 0 && result.ERRORS.length === 0 && (
            <div className="vd-alert vd-alert--info">Aucune fiche à soumettre.</div>
          )}
          {result.SUBMITTED.length > 0 && (
            <div className="vd-alert vd-alert--success">
              {result.SUBMITTED.length} fiche(s) soumise(s) au marketing.
            </div>
          )}
          {result.ERRORS.length > 0 && (
            <>
              <div className="vd-alert vd-alert--danger">
                {result.ERRORS.length} fiche(s) non soumise(s) : corrigez les informations
                erronées puis soumettez-les de nouveau.
              </div>
              <div className="vd-table-wrapper vd-import__table">
                <table className="vd-table vd-table--compact">
                  <thead>
                    <tr>
                      <th>Fiche</th>
                      <th>Erreurs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ERRORS.map((e) => (
                      <tr key={e.SHTID}>
                        <td>
                          <button
                            type="button"
                            className="vd-link"
                            onClick={() => onOpenSheet(e.SHTID)}
                          >
                            <strong>{sheetLabel(e)}</strong>
                          </button>
                        </td>
                        <td>
                          <ul className="vd-plain-list vd-import__errors">
                            {e.MESSAGES.map((m) => (
                              <li key={m}>{m}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </ModalBody>
    <ModalFooter>
      <CustomButton variant="neutral" onClick={onClose} size="xs">
        Fermer
      </CustomButton>
    </ModalFooter>
  </Modal>
);

export default BulkSubmitResultModal;
