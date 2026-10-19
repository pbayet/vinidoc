import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type { SheetStatus } from "../../../entities/vinidoc/vinidoc.types";
import { STATUS_ICONS, STATUS_LABELS } from "../lib/format";

interface StatusBadgeProps {
  status: SheetStatus;
  /** Numéro de la dernière version validée (affiché en complément) */
  lastVersion?: number;
}

/** Pastille de statut d'une fiche (brouillon, à valider, validée, refusée). */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lastVersion }) => (
  <span className="vd-status-wrapper">
    <span className={`vd-status vd-status--${status.toLowerCase()}`}>
      <Icon iconName={STATUS_ICONS[status]} />
      {STATUS_LABELS[status]}
    </span>
    {!!lastVersion && status !== "VALIDATED" && (
      <span className="vd-status vd-status--version" title="Dernière version validée, utilisée pour la génération">
        v{lastVersion} validée
      </span>
    )}
  </span>
);

export default StatusBadge;
