import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalFooter } from "@uvcdr/modal";
import {
  CustomButton,
  CustomInputCheckbox,
  CustomInputFile,
  Icon,
} from "@uvcdr/custom-form-system";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import StatusBadge from "../ui/StatusBadge";
import { colorLabel } from "../lib/format";
import {
  KNOWN_COLUMNS,
  findExisting,
  importGroup,
  parseSheetCsv,
  readCsvFile,
  runPool,
  type ImportOutcome,
  type ImportResult,
  type ParsedImport,
} from "./sheetImport";

interface SheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Appelé après un import ayant créé ou modifié au moins une fiche */
  onImported: () => void;
}

const CSV_MAX_SIZE = 10 * 1024 * 1024;

const OUTCOME_CHIPS: Record<ImportOutcome, { label: string; className: string }> = {
  CREATED: { label: "Créée", className: "vd-chip--success" },
  UPDATED: { label: "Mise à jour", className: "vd-chip--success" },
  SKIPPED: { label: "Ignorée", className: "vd-chip--muted" },
  FAILED: { label: "Échec", className: "vd-chip--danger" },
};

/**
 * Import de fiches œnologiques depuis un CSV (une ligne par fiche et par
 * langue). Le fichier est analysé et contrôlé dès sa sélection ; l'aperçu
 * indique les fiches nouvelles, existantes et en erreur avant l'import.
 */
const SheetImportModal: React.FC<SheetImportModalProps> = ({ isOpen, onClose, onImported }) => {
  const api = useVinidocApi();
  const { languages, colors, defaultLng } = useVinidoc();

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setUpdateExisting(false);
  }, [isOpen]);

  // Analyse du fichier : lecture, contrôles, recherche des fiches existantes.
  useEffect(() => {
    setParsed(null);
    setAnalyzeError(null);
    setResults({});
    if (!file) return;
    let cancelled = false;
    setAnalyzing(true);
    (async () => {
      try {
        const result = parseSheetCsv(await readCsvFile(file), { languages, colors, defaultLng });
        if (!result.FATAL) await findExisting(api, result.GROUPS);
        if (!cancelled) setParsed(result);
      } catch (e) {
        if (!cancelled) {
          setAnalyzeError((e as { message?: string })?.message ?? "Lecture du fichier impossible.");
        }
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, api, languages, colors, defaultLng]);

  const groups = useMemo(() => parsed?.GROUPS ?? [], [parsed]);
  const counts = useMemo(() => {
    const invalid = groups.filter((g) => g.ERRORS.length).length;
    const existing = groups.filter((g) => !g.ERRORS.length && g.EXISTING).length;
    return { invalid, existing, created: groups.length - invalid - existing };
  }, [groups]);
  const toImport = counts.created + (updateExisting ? counts.existing : 0);
  const done = Object.keys(results).length > 0;

  const runImport = async () => {
    setImporting(true);
    setResults({});
    const all: ImportResult[] = [];
    // Séquentiel par fiche (verrou ROWVER), quelques fiches en parallèle.
    await runPool(groups, 3, async (group) => {
      const result = await importGroup(api, group, { defaultLng, updateExisting });
      all.push(result);
      setResults((prev) => ({ ...prev, [group.KEY]: result }));
    });
    setImporting(false);
    if (all.some((r) => r.OUTCOME === "CREATED" || r.OUTCOME === "UPDATED")) onImported();
  };

  const summary = useMemo(() => {
    const list = Object.values(results);
    const n = (o: ImportOutcome) => list.filter((r) => r.OUTCOME === o).length;
    return { created: n("CREATED"), updated: n("UPDATED"), skipped: n("SKIPPED"), failed: n("FAILED") };
  }, [results]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Importer des fiches depuis un CSV"
      size="xl"
      preventClose={importing}
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text vd-stack vd-import">
          <p className="vd-muted">
            Une ligne par fiche et par langue, séparateur « ; » ou « , ». Colonnes reconnues :{" "}
            {KNOWN_COLUMNS.join(", ")}. Les lignes de même code vrac et millésime forment une
            seule fiche ; sans colonne LNGCOD, la langue par défaut ({defaultLng.toUpperCase()}) est
            utilisée.
          </p>
          <CustomInputFile
            label="Fichier .csv"
            accept=".csv,text/csv"
            required
            maxFileSize={CSV_MAX_SIZE}
            onChange={(files) => setFile(files[0] ?? null)}
            onClear={() => setFile(null)}
            inputSize="xs"
            disabled={importing}
          />

          {analyzing && <div className="vd-alert vd-alert--info">Analyse du fichier…</div>}
          {analyzeError && <div className="vd-alert vd-alert--danger">{analyzeError}</div>}
          {parsed?.FATAL && <div className="vd-alert vd-alert--danger">{parsed.FATAL}</div>}
          {parsed && parsed.IGNORED.length > 0 && (
            <div className="vd-alert vd-alert--warning">
              Colonnes ignorées : {parsed.IGNORED.join(", ")}
            </div>
          )}

          {parsed && !parsed.FATAL && (
            <>
              <div className="vd-alert vd-alert--info">
                <strong>{groups.length}</strong> fiche(s) dans le fichier :
                <span className="vd-chip vd-chip--success">{counts.created} nouvelle(s)</span>
                <span className="vd-chip vd-chip--warning">{counts.existing} existante(s)</span>
                {counts.invalid > 0 && (
                  <span className="vd-chip vd-chip--danger">{counts.invalid} en erreur</span>
                )}
              </div>

              {counts.existing > 0 && (
                <div>
                  <CustomInputCheckbox
                    label="Mettre à jour les fiches existantes"
                    checked={updateExisting}
                    disabled={importing}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    inputSize="xs"
                  />
                  <p className="vd-muted">
                    Les cellules vides conservent la valeur actuelle de la fiche. Une fiche
                    validée ou soumise repasse en brouillon selon les règles habituelles de
                    modification.
                  </p>
                </div>
              )}

              {done && (
                <div
                  className={`vd-alert ${summary.failed ? "vd-alert--warning" : "vd-alert--success"}`}
                >
                  {importing ? "Import en cours… " : "Import terminé : "}
                  {summary.created} créée(s), {summary.updated} mise(s) à jour,{" "}
                  {summary.skipped} ignorée(s), {summary.failed} en échec.
                </div>
              )}

              <div className="vd-table-wrapper vd-import__table">
                <table className="vd-table vd-table--compact">
                  <thead>
                    <tr>
                      <th>Code vrac</th>
                      <th>Millésime</th>
                      <th>Appellation</th>
                      <th>Couleur</th>
                      <th>Langues</th>
                      <th>Fiche</th>
                      <th>Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => {
                      const result = results[g.KEY];
                      return (
                        <tr key={g.KEY} className={g.ERRORS.length ? "vd-import__row--ko" : undefined}>
                          <td>
                            <strong>{g.CODVRAC || "—"}</strong>
                          </td>
                          <td>{g.MILLESIME ?? "—"}</td>
                          <td>{g.COMMON.APPELL}</td>
                          <td>{g.COMMON.COLCOD && colorLabel(colors, g.COMMON.COLCOD)}</td>
                          <td>
                            {g.ROWS.map((r) => (
                              <span key={r.LINE} className="vd-chip">
                                {r.LNGCOD.toUpperCase()}
                              </span>
                            ))}
                          </td>
                          <td>
                            {g.ERRORS.length > 0 ? (
                              <ul className="vd-plain-list vd-import__errors">
                                {g.ERRORS.map((e) => (
                                  <li key={e}>{e}</li>
                                ))}
                              </ul>
                            ) : g.EXISTING ? (
                              <StatusBadge
                                status={g.EXISTING.STATUS}
                                lastVersion={g.EXISTING.LASTVER}
                              />
                            ) : (
                              <span className="vd-chip vd-chip--success">Nouvelle</span>
                            )}
                          </td>
                          <td>
                            {result && (
                              <>
                                <span className={`vd-chip ${OUTCOME_CHIPS[result.OUTCOME].className}`}>
                                  {OUTCOME_CHIPS[result.OUTCOME].label}
                                </span>
                                {result.MESSAGE && (
                                  <span className="vd-muted">{result.MESSAGE}</span>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <CustomButton variant="neutral" onClick={onClose} disabled={importing} size="xs">
          {done ? "Fermer" : "Annuler"}
        </CustomButton>
        {!done && (
          <CustomButton
            variant="success"
            leftIcon={<Icon iconName="file-import" />}
            loading={importing}
            disabled={!parsed || !!parsed.FATAL || analyzing || importing || toImport === 0}
            onClick={() => void runImport()}
            size="xs"
          >
            Importer {toImport > 0 ? `${toImport} fiche(s)` : ""}
          </CustomButton>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default SheetImportModal;
