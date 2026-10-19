import React, { useState } from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import SectionCard from "../../../shared/ui/SectionCard/ui/SectionCard";
import CheckReportView from "../ui/CheckReportView";
import { useVinidocApi } from "../api/useVinidocApi";
import { languageName } from "../lib/format";
import { useVinidoc } from "../context/VinidocContext";
import type { CheckReport } from "../../../entities/vinidoc/vinidoc.types";

interface CheckCardProps {
  SHTID: number;
  lng: string;
  /** Des modifications ne sont pas enregistrées : le contrôle porte sur l'enregistré */
  hasUnsavedChanges: boolean;
}

/**
 * Contrôle des textes enregistrés face aux modèles actifs (longueurs max,
 * balises obligatoires) — à lancer avant de soumettre la fiche.
 */
const CheckCard: React.FC<CheckCardProps> = ({ SHTID, lng, hasUnsavedChanges }) => {
  const api = useVinidocApi();
  const { languages } = useVinidoc();
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    try {
      setReport(await api.checkSheet(SHTID, { LNGCOD: lng, SOURCE: "CURRENT" }, { setLoading }));
    } catch {
      /* toast déjà affiché */
    }
  };

  const stale = report && report.LNGCOD !== lng;

  return (
    <SectionCard
      title="Contrôle des modèles"
      icon="ruler"
      description={`Vérifie que les textes enregistrés en ${languageName(languages, lng)} respectent les longueurs max des modèles PowerPoint actifs.`}
      actions={
        <CustomButton size="xs" variant="outline" leftIcon={<Icon iconName="list-check" />} loading={loading} onClick={() => void run()}>
          Contrôler
        </CustomButton>
      }
    >
      {hasUnsavedChanges && (
        <div className="vd-alert vd-alert--warning">
          <Icon iconName="triangle-exclamation" /> Des modifications ne sont pas enregistrées : le contrôle porte sur
          la dernière version enregistrée.
        </div>
      )}
      {report && !stale ? (
        <CheckReportView report={report} />
      ) : (
        <p className="vd-muted">Lancez le contrôle pour afficher le résultat par modèle.</p>
      )}
    </SectionCard>
  );
};

export default CheckCard;
