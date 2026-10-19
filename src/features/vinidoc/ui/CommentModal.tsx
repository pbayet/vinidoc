import React, { useEffect, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import {
  CustomButton,
  CustomTextarea,
  Icon,
  type ButtonVariant,
} from "@uvcdr/custom-form-system";

interface CommentModalProps {
  isOpen: boolean;
  title: string;
  /** Texte d'explication au-dessus du champ */
  message?: React.ReactNode;
  label?: string;
  /** Commentaire obligatoire (ex. motif de refus) */
  required?: boolean;
  confirmLabel: string;
  confirmIcon?: string;
  variant?: ButtonVariant;
  loading?: boolean;
  onConfirm: (comment: string) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Confirmation d'une action de workflow avec commentaire (soumission,
 * validation, refus avec motif obligatoire, suppression).
 */
const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  title,
  message,
  label = "Commentaire (optionnel)",
  required = false,
  confirmLabel,
  confirmIcon = "check",
  variant = "primary",
  loading = false,
  onConfirm,
  onClose,
}) => {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (isOpen) setComment("");
  }, [isOpen]);

  const invalid = required && comment.trim().length < 3;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
      preventClose={loading}
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text">
          {message && <div className="vd-modal-message">{message}</div>}
          <CustomTextarea
            label={label}
            value={comment}
            rows={4}
            maxLength={1000}
            required={required}
            onChange={(e) => setComment(e.target.value)}
          />
          {required && invalid && (
            <p className="vd-muted">3 caractères minimum.</p>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <CustomButton variant="neutral" onClick={onClose} disabled={loading}>
          Annuler
        </CustomButton>
        <CustomButton
          variant={variant}
          leftIcon={<Icon iconName={confirmIcon} />}
          loading={loading}
          disabled={invalid || loading}
          onClick={() => void onConfirm(comment.trim())}
        >
          {confirmLabel}
        </CustomButton>
      </ModalFooter>
    </Modal>
  );
};

export default CommentModal;
