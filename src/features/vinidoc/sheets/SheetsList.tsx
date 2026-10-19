import React, { useCallback, useEffect, useState } from "react";
import { Navigate, useMatch, useNavigate } from "react-router-dom";
import {
  CustomButton,
  CustomInput,
  CustomSelect,
  Icon,
  type SelectOption,
} from "@uvcdr/custom-form-system";
import PageLayout from "../../../shared/ui/PageLayout/PageLayout";
import { useWebSocket } from "../../../shared/lib/hooks/useWebSocket";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import StatusBadge from "../ui/StatusBadge";
import SheetEditor from "./SheetEditor";
import SheetCreateForm from "./SheetCreateForm";
import SheetImportModal from "../import/SheetImportModal";
import BulkSubmitResultModal from "./BulkSubmitResultModal";
import CommentModal from "../ui/CommentModal";
import { STATUS_LABELS, colorLabel, formatDateTime } from "../lib/format";
import type {
  BulkSubmitResult,
  SheetList,
  SheetStatus,
} from "../../../entities/vinidoc/vinidoc.types";

/** Segment de route de création (`/oenologie/new`). */
export const NEW_SHEET_PARAM = "new";

interface SheetsListProps {
  title: string;
  /**
   * Route de la liste (`/oenologie`, `/validation`). La création
   * (`<basePath>/new`) et l'édition (`<basePath>/:shtid`) s'ouvrent en
   * modale au-dessus de la liste, en conservant leur route (routes enfants
   * dans router.tsx).
   */
  basePath: string;
  /** Statut imposé (page « À valider » : SUBMITTED) */
  fixedStatus?: SheetStatus;
  /** Texte affiché quand la liste est vide */
  emptyLabel?: string;
}

const PAGESIZE = 50;

const STATUS_OPTIONS: SelectOption[] = (
  Object.keys(STATUS_LABELS) as SheetStatus[]
).map((s) => ({
  type: "option",
  value: s,
  label: STATUS_LABELS[s],
}));

/**
 * Liste paginée des fiches œnologiques, avec recherche (code vrac,
 * appellation, intitulé) et filtres. Rafraîchie en temps réel sur les
 * évènements WebSocket du module.
 */
const SheetsList: React.FC<SheetsListProps> = ({
  title,
  basePath,
  fixedStatus,
  emptyLabel = "Aucune fiche.",
}) => {
  const api = useVinidocApi();
  const navigate = useNavigate();
  const { rights, colors } = useVinidoc();

  // Modale ouverte par la route enfant : création ou édition d'une fiche.
  const shtid = useMatch(`${basePath}/:shtid`)?.params.shtid;
  const isCreating = shtid === NEW_SHEET_PARAM;
  const editId = shtid && !isCreating ? Number(shtid) : null;
  const closeModal = useCallback(
    () => navigate(basePath),
    [navigate, basePath],
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [color, setColor] = useState("");
  const [millesime, setMillesime] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SheetList | null>(null);
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkSubmitResult | null>(null);

  // Recherche différée : pas d'appel API à chaque frappe.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const result = await api.listSheets(
        {
          SEARCH: debouncedSearch || undefined,
          STATUS: (fixedStatus ?? status) as SheetStatus | "",
          COLCOD: color || undefined,
          MILLESIME: millesime ? Number(millesime) : undefined,
          PAGE: page,
          PAGESIZE,
        },
        { setLoading },
      );
      setData(result);
    } catch {
      /* toast déjà affiché */
    }
  }, [api, debouncedSearch, fixedStatus, status, color, millesime, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(() => void load(), [load]);

  // Soumission en masse : fiches DRAFT / REJECTED correspondant aux filtres.
  const submitAll = async (comment: string) => {
    try {
      const result = await api.submitAllSheets(
        {
          SEARCH: debouncedSearch || undefined,
          COLCOD: color || undefined,
          MILLESIME: millesime ? Number(millesime) : undefined,
          COMMENT: comment || undefined,
        },
        { setLoading: setBulkSaving },
      );
      setBulkOpen(false);
      setBulkResult(result);
      void load();
    } catch {
      /* toast déjà affiché */
    }
  };
  const hasFilters = !!(debouncedSearch || color || millesime);
  useWebSocket("vinidoc.sheet.created", refresh);
  useWebSocket("vinidoc.sheet.updated", refresh);
  useWebSocket("vinidoc.sheet.submitted", refresh);
  useWebSocket("vinidoc.sheet.validated", refresh);
  useWebSocket("vinidoc.sheet.rejected", refresh);
  useWebSocket("vinidoc.sheet.deleted", refresh);

  const colorOptions: SelectOption[] = colors.map((c) => ({
    type: "option",
    value: c.COLCOD,
    label: colorLabel(colors, c.COLCOD),
  }));

  const pages = data ? Math.max(1, Math.ceil(data.TOTAL / PAGESIZE)) : 1;
  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPage(1);
    };

  // Création réservée au droit EDIT (et à la liste générale) ; id invalide → liste.
  const canCreate = rights.EDIT && !fixedStatus;

  if (
    (isCreating && !canCreate) ||
    (editId != null && (!Number.isInteger(editId) || editId <= 0))
  ) {
    return <Navigate to={basePath} replace />;
  }

  return (
    <PageLayout
      title={title}
      actions={
        <>
          <CustomButton
            iconOnly
            size="xs"
            variant="ghost"
            title="Rafraîchir"
            leftIcon={<Icon iconName="rotate-right" />}
            loading={loading}
            onClick={refresh}
          />
          {canCreate && (
            <CustomButton
              leftIcon={<Icon iconName="paper-plane" />}
              variant="primary"
              size="xs"
              onClick={() => setBulkOpen(true)}
            >
              Tout soumettre au marketing
            </CustomButton>
          )}
          {canCreate && (
            <CustomButton
              leftIcon={<Icon iconName="file-import" />}
              variant="outline"
              size="xs"
              onClick={() => setImportOpen(true)}
            >
              Importer CSV
            </CustomButton>
          )}
          {canCreate && (
            <CustomButton
              leftIcon={<Icon iconName="plus" />}
              variant="success"
              size="xs"
              onClick={() => navigate(`${basePath}/${NEW_SHEET_PARAM}`)}
            >
              Nouvelle fiche
            </CustomButton>
          )}
        </>
      }
    >
      <div className="vd-card">
        <div className="vd-filters">
          <CustomInput
            inputSize="xs"
            label="Recherche"
            placeholder="Code vrac, appellation, intitulé…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            customInputButton={{ variant: "search" }}
          />
          {!fixedStatus && (
            <CustomSelect
              inputSize="xs"
              label="Statut"
              placeholder="Tous"
              options={STATUS_OPTIONS}
              value={status}
              onChange={resetPage(setStatus)}
            />
          )}
          <CustomSelect
            inputSize="xs"
            label="Couleur"
            placeholder="Toutes"
            options={colorOptions}
            value={color}
            onChange={resetPage(setColor)}
          />
          <CustomInput
            inputSize="xs"
            type="number"
            label="Millésime"
            placeholder="ex. 2025"
            value={millesime}
            onChange={(e) => resetPage(setMillesime)(e.target.value)}
          />
        </div>

        <div className="vd-table-wrapper">
          <table className="vd-table vd-table--hover">
            <thead>
              <tr>
                <th>Code vrac</th>
                <th>Millésime</th>
                <th>Appellation</th>
                <th>Couleur</th>
                <th>Intitulé</th>
                <th>Langues</th>
                <th>Statut</th>
                <th>Contrôle</th>
                <th>{fixedStatus === "SUBMITTED" ? "Soumise" : "Modifiée"}</th>
              </tr>
            </thead>
            <tbody>
              {data?.ITEMS.map((s) => (
                <tr
                  key={s.SHTID}
                  tabIndex={0}
                  onClick={() => navigate(`${basePath}/${s.SHTID}`)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && navigate(`${basePath}/${s.SHTID}`)
                  }
                >
                  <td>
                    <strong>{s.CODVRAC}</strong>
                  </td>
                  <td>{s.MILLESIME ?? "—"}</td>
                  <td>{s.APPELL}</td>
                  <td>
                    <span
                      className={`vd-color vd-color--${s.COLCOD.toLowerCase()}`}
                    >
                      {colorLabel(colors, s.COLCOD)}
                    </span>
                  </td>
                  <td className="vd-ellipsis">
                    {s.LIBELLE || <span className="vd-muted">—</span>}
                  </td>
                  <td>
                    {s.LANGUAGES.map((l) => (
                      <span key={l} className="vd-chip">
                        {l.toUpperCase()}
                      </span>
                    ))}
                  </td>
                  <td>
                    <StatusBadge status={s.STATUS} lastVersion={s.LASTVER} />
                  </td>
                  <td>
                    {s.ISSUES.length > 0 ? (
                      <span
                        className="vd-chip vd-chip--danger"
                        title={s.ISSUES.join(String.fromCharCode(10))}
                      >
                        <Icon iconName="triangle-exclamation" />
                        {s.ISSUES.length} erreur{s.ISSUES.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span
                        className="vd-chip vd-chip--success"
                        title="Aucune anomalie détectée"
                      >
                        <Icon iconName="circle-check" />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="vd-muted">
                    {fixedStatus === "SUBMITTED"
                      ? `${formatDateTime(s.SUBDAT)} — ${s.SUBUSR ?? ""}`
                      : `${formatDateTime(s.MODDAT)} — ${s.MODUSR}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.ITEMS.length === 0 && (
            <div className="vd-empty">{emptyLabel}</div>
          )}
          {!data && loading && <div className="vd-empty">Chargement…</div>}
        </div>

        {data && data.TOTAL > PAGESIZE && (
          <div className="vd-pagination">
            <CustomButton
              size="xs"
              variant="outline"
              disabled={page <= 1}
              leftIcon={<Icon iconName="chevron-left" />}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </CustomButton>
            <span>
              Page {page} / {pages} — {data.TOTAL} fiches
            </span>
            <CustomButton
              size="xs"
              variant="outline"
              disabled={page >= pages}
              rightIcon={<Icon iconName="chevron-right" />}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </CustomButton>
          </div>
        )}
        {data && data.TOTAL <= PAGESIZE && data.TOTAL > 0 && (
          <div className="vd-pagination vd-muted">{data.TOTAL} fiche(s)</div>
        )}
      </div>

      {canCreate && (
        <SheetImportModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={refresh}
        />
      )}
      {canCreate && (
        <CommentModal
          isOpen={bulkOpen}
          title="Tout soumettre au marketing"
          message={
            <>
              Toutes les fiches en brouillon ou refusées
              {hasFilters ? " correspondant aux filtres actuels" : ""} seront
              envoyées au marketing pour validation. Les fiches contenant des
              informations erronées (texte trop long, champ obligatoire vide,
              traduction par défaut absente) ne seront pas soumises.
            </>
          }
          confirmLabel="Tout soumettre"
          confirmIcon="paper-plane"
          loading={bulkSaving}
          onConfirm={submitAll}
          onClose={() => setBulkOpen(false)}
        />
      )}
      <BulkSubmitResultModal
        result={bulkResult}
        onClose={() => setBulkResult(null)}
        onOpenSheet={(id) => {
          setBulkResult(null);
          navigate(`${basePath}/${id}`);
        }}
      />
      {isCreating && (
        <SheetCreateForm
          onClose={closeModal}
          onCreated={(id) => {
            void load();
            navigate(`${basePath}/${id}`, { replace: true });
          }}
        />
      )}
      {/* `key` : repart d'un éditeur vierge en passant d'une fiche à l'autre. */}
      {editId != null && (
        <SheetEditor key={editId} SHTID={editId} onClose={closeModal} />
      )}
    </PageLayout>
  );
};

export default SheetsList;
