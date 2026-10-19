import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import { useWebSocket } from "../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../features/vinidoc/api/useVinidocApi";
import GenerationForm from "../features/vinidoc/generation/GenerationForm";
import GenerationHistory from "../features/vinidoc/generation/GenerationHistory";
import type {
  Generation,
  SheetListItem,
  Template,
} from "../entities/vinidoc/vinidoc.types";

const HISTORY_LIMIT = 15;

/**
 * Accueil — génération des fiches techniques.
 *
 * Parcours : choix d'un vin → langue et modèle → contrôle automatique des
 * longueurs → génération PDF ou PowerPoint. Vin validé : dernière version
 * VALIDÉE ; vin non validé par le marketing : saisie en cours (avertissement,
 * non bloquant).
 *
 * La page charge les référentiels et l'historique ; le formulaire
 * (CustomForm) vit dans `features/vinidoc/generation`.
 */
const HomePage: React.FC = () => {
  const api = useVinidocApi();
  const [searchParams, setSearchParams] = useSearchParams();

  const [sheets, setSheets] = useState<SheetListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [history, setHistory] = useState<Generation[]>([]);
  const [sheetId, setSheetId] = useState(searchParams.get("sheet") ?? "");

  /* ───────────────────────── Référentiels ───────────────────────── */

  const loadLists = useCallback(async () => {
    try {
      const [list, tpls] = await Promise.all([
        api.listSheets({
          PAGESIZE: 200,
        }),
        api.listTemplates({ ACTIVE: true }),
      ]);
      setSheets(list.ITEMS);
      setTemplates(tpls);
    } catch {
      /* toast déjà affiché */
    }
  }, [api]);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(
        await api.listGenerations(
          {
            SHTID: sheetId ? Number(sheetId) : undefined,
            LIMIT: HISTORY_LIMIT,
          },
          { silentError: true },
        ),
      );
    } catch {
      /* non bloquant */
    }
  }, [api, sheetId]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const refreshLists = useCallback(() => void loadLists(), [loadLists]);
  // Statut / contenu des vins (validé ou non, saisie en cours) et modèles.
  useWebSocket("vinidoc.sheet.created", refreshLists);
  useWebSocket("vinidoc.sheet.updated", refreshLists);
  useWebSocket("vinidoc.sheet.submitted", refreshLists);
  useWebSocket("vinidoc.sheet.validated", refreshLists);
  useWebSocket("vinidoc.sheet.rejected", refreshLists);
  useWebSocket("vinidoc.sheet.deleted", refreshLists);
  useWebSocket("vinidoc.template.created", refreshLists);
  useWebSocket("vinidoc.template.updated", refreshLists);
  useWebSocket("vinidoc.template.deleted", refreshLists);

  /* ───────────────────────── Vin sélectionné ───────────────────────── */

  const onSheetChange = useCallback(
    (value: string) => {
      setSheetId(value);
      setSearchParams(value ? { sheet: value } : {}, { replace: true });
    },
    [setSearchParams],
  );

  const selectedSheet = sheets.find((s) => String(s.SHTID) === sheetId);

  return (
    <PageLayout title="Fiches techniques">
      <div className="vd-home">
        <GenerationForm
          sheets={sheets}
          templates={templates}
          initialSheetId={sheetId}
          onSheetChange={onSheetChange}
          onGenerated={() => void loadHistory()}
        />
        <GenerationHistory
          history={history}
          sheetCode={selectedSheet?.CODVRAC}
        />
      </div>
    </PageLayout>
  );
};

export default HomePage;
