/**
 * useVinidocStats — charge les données de VINIDOC utiles à la page
 * Statistiques (fiches œnologiques, modèles PowerPoint, historique des
 * générations) via les routes existantes de l'API /vinidoc, et en dérive les
 * indicateurs et répartitions affichés par StatistiquesPage.tsx.
 *
 *  - Fiches : toutes les fiches non supprimées (GET /sheets, paginé par
 *    SHEETS_PAGESIZE — on enchaîne les pages jusqu'à TOTAL). C'est un état
 *    « photo » à l'instant T, non filtré par la plage de dates (la liste ne
 *    porte pas de date de création).
 *  - Générations : les GENERATIONS_LIMIT plus récentes (GET /generations,
 *    plafond de l'API), filtrées sur la plage de dates de génération
 *    (CREDAT) optionnelle.
 *  - Modèles : tous (GET /templates), pour le nombre de modèles actifs.
 *
 * L'agrégation (regroupement, clé de bucket temporel) s'appuie sur les
 * utilitaires de `@uvcdr/statistics-system` (`groupBy`, `bucketKeyForDate`),
 * comme dans les pages Statistiques des autres applis UNIS (ticketing, FSA).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { bucketKeyForDate, groupBy } from "@uvcdr/statistics-system";
import { useVinidocApi } from "../../vinidoc/api/useVinidocApi";
import { useVinidoc } from "../../vinidoc/context/VinidocContext";
import {
  colorLabel,
  languageName,
  STATUS_LABELS,
} from "../../vinidoc/lib/format";
import type {
  Generation,
  SheetListItem,
  SheetStatus,
  Template,
} from "../../../entities/vinidoc/vinidoc.types";

/** Taille de page max acceptée par GET /sheets (cf. validators.js de l'API). */
const SHEETS_PAGESIZE = 200;
/** Plafond de GET /generations (LIMIT max côté API). */
export const GENERATIONS_LIMIT = 500;
/** Nombre de lignes max affichées dans les cartes "top". */
const TOP_LIMIT = 8;
/** Profondeur de l'historique mensuel quand aucune plage n'est choisie. */
const DEFAULT_MONTHS_HISTORY = 6;
/** Garde-fou d'affichage si une plage de dates très large est choisie. */
const MAX_MONTH_BUCKETS = 24;

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
});

/** Ordre d'affichage des statuts (cycle de vie d'une fiche). */
const STATUS_ORDER: SheetStatus[] = ["DRAFT", "SUBMITTED", "VALIDATED", "REJECTED"];

/** Couleurs des statuts, alignées sur les pastilles StatusBadge (vd-status--*). */
const STATUS_CHART_COLORS: Record<SheetStatus, string> = {
  DRAFT: "var(--stat-color-info)",
  SUBMITTED: "var(--stat-color-warning)",
  VALIDATED: "var(--stat-color-success)",
  REJECTED: "var(--stat-color-danger)",
};

/** Couleurs des vins, alignées sur les pastilles .vd-color--* de vinidoc.scss. */
const WINE_CHART_COLORS: Record<string, string> = {
  ROUGE: "#7b1e2b",
  ROSE: "#f2a7a6",
  BLANC: "#e3cf6d",
};

/** Une ligne de répartition, prête pour <BarChart />/<PieChart />/<StatsTable />. */
export interface GroupRow {
  key: string;
  label: string;
  count: number;
  color?: string;
}

/** Couverture d'une langue : nombre de fiches ayant des textes dans cette langue. */
export interface LanguageCoverageRow {
  code: string;
  label: string;
  count: number;
  isDefault: boolean;
}

/** Part d'une option de génération (PDF, contenu validé, article, HVE, BIO). */
export interface GenerationOptionRow {
  key: string;
  label: string;
  count: number;
}

/**
 * Regroupe `items` par clé, trie du plus au moins fréquent et ne garde que
 * les `limit` premières lignes.
 */
function topGroups<T>(
  items: T[],
  keyOf: (item: T) => string,
  labelOf: (key: string) => string = (key) => key,
  limit: number = Number.POSITIVE_INFINITY,
): GroupRow[] {
  return groupBy(items, keyOf)
    .map((group) => {
      const key = String(group.key);
      return { key, label: labelOf(key), count: group.count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function useVinidocStats(dateFrom: string, dateTo: string) {
  const api = useVinidocApi();
  const { languages, colors } = useVinidoc();

  const [sheets, setSheets] = useState<SheetListItem[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    /** Toutes les fiches : pages successives jusqu'au TOTAL annoncé. */
    const loadAllSheets = async (): Promise<SheetListItem[]> => {
      const first = await api.listSheets(
        { PAGE: 1, PAGESIZE: SHEETS_PAGESIZE },
        { silentError: true },
      );
      const pages = Math.ceil(first.TOTAL / SHEETS_PAGESIZE);
      if (pages <= 1) return first.ITEMS;
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          api.listSheets(
            { PAGE: i + 2, PAGESIZE: SHEETS_PAGESIZE },
            { silentError: true },
          ),
        ),
      );
      return [first, ...rest].flatMap((page) => page.ITEMS);
    };

    Promise.all([
      loadAllSheets(),
      api.listTemplates({}, { silentError: true }),
      api.listGenerations({ LIMIT: GENERATIONS_LIMIT }, { silentError: true }),
    ])
      .then(([sheetItems, templateItems, generationItems]) => {
        if (cancelled) return;
        setSheets(sheetItems);
        setTemplates(templateItems);
        setGenerations(generationItems);
        setLoadedAt(new Date());
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [api, reloadKey]);

  const fromDate = useMemo(
    () => (dateFrom ? new Date(`${dateFrom}T00:00:00`) : null),
    [dateFrom],
  );
  const toDate = useMemo(
    () => (dateTo ? new Date(`${dateTo}T23:59:59.999`) : null),
    [dateTo],
  );

  /* ───────────────────────── Fiches œnologiques ───────────────────────── */

  const sheetStats = useMemo(() => {
    const total = sheets.length;
    const countStatus = (s: SheetStatus) =>
      sheets.filter((x) => x.STATUS === s).length;

    const byStatus: GroupRow[] = STATUS_ORDER.map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      count: countStatus(status),
      color: STATUS_CHART_COLORS[status],
    })).filter((row) => row.count > 0);

    const byColor: GroupRow[] = topGroups(
      sheets.filter((s) => s.COLCOD),
      (s) => s.COLCOD,
      (code) => colorLabel(colors, code),
    ).map((row) => ({ ...row, color: WINE_CHART_COLORS[row.key] }));

    // Millésimes du plus ancien au plus récent (lecture chronologique) ;
    // les fiches sans millésime sont regroupées en fin d'axe.
    const byVintage: GroupRow[] = groupBy(sheets, (s) =>
      s.MILLESIME === null ? "NM" : String(s.MILLESIME),
    )
      .map((g) => ({
        key: String(g.key),
        label: g.key === "NM" ? "Sans millésime" : String(g.key),
        count: g.count,
      }))
      .sort((a, b) => {
        if (a.key === "NM") return 1;
        if (b.key === "NM") return -1;
        return Number(a.key) - Number(b.key);
      });

    const byAppellation = topGroups(
      sheets.filter((s) => s.APPELL?.trim()),
      (s) => s.APPELL.trim(),
    );

    // Couverture des traductions : langues actives, langue par défaut en tête.
    const languageCoverage: LanguageCoverageRow[] = languages
      .filter((l) => l.ACTIVE)
      .sort((a, b) =>
        a.ISDEFAULT === b.ISDEFAULT ? a.SORTORD - b.SORTORD : a.ISDEFAULT ? -1 : 1,
      )
      .map((l) => ({
        code: l.LNGCOD,
        label: l.LNGNAM,
        count: sheets.filter((s) => s.LANGUAGES.includes(l.LNGCOD)).length,
        isDefault: l.ISDEFAULT,
      }));

    // Fiches disposant d'au moins une version validée (LASTVER > 0), donc
    // générables avec du contenu validé — même critère que le filtre
    // GENERABLE de GET /sheets.
    const withValidatedVersion = sheets.filter((s) => s.LASTVER > 0).length;

    return {
      total,
      draftCount: countStatus("DRAFT"),
      submittedCount: countStatus("SUBMITTED"),
      validatedCount: countStatus("VALIDATED"),
      rejectedCount: countStatus("REJECTED"),
      withIssuesCount: sheets.filter((s) => s.ISSUES.length > 0).length,
      generableCount: withValidatedVersion,
      validationRate: total ? (countStatus("VALIDATED") / total) * 100 : null,
      byStatus,
      byColor,
      byVintage,
      byAppellation,
      languageCoverage,
    };
  }, [sheets, colors, languages]);

  /* ───────────────────────────── Générations ───────────────────────────── */

  const generationStats = useMemo(() => {
    const scoped = generations.filter((g) => {
      const d = new Date(g.CREDAT);
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });

    const byTemplate = topGroups(
      scoped,
      (g) => g.TPLNAM || String(g.TPLID),
      undefined,
      TOP_LIMIT,
    );
    const byUser = topGroups(scoped, (g) => g.CREUSR, undefined, TOP_LIMIT);
    const byLanguage = topGroups(
      scoped,
      (g) => g.LNGCOD,
      (code) => languageName(languages, code),
    );
    const bySheet = topGroups(
      scoped,
      (g) => `${g.CODVRAC}${g.MILLESIME ? ` ${g.MILLESIME}` : ""}`,
      undefined,
      TOP_LIMIT,
    );

    const countWhere = (predicate: (g: Generation) => boolean) =>
      scoped.filter(predicate).length;

    const options: GenerationOptionRow[] = [
      { key: "PDF", label: "Format PDF", count: countWhere((g) => g.FORMAT === "pdf") },
      { key: "PPTX", label: "Format PowerPoint", count: countWhere((g) => g.FORMAT === "pptx") },
      {
        key: "VALIDATED",
        label: "Contenu validé (marketing)",
        count: countWhere((g) => g.SOURCE === "VALIDATED"),
      },
      {
        key: "ARTICLE",
        label: "Avec article (données logistiques)",
        count: countWhere((g) => !!g.COD_ARTICLE),
      },
      { key: "HVE", label: "Mention HVE", count: countWhere((g) => g.HVE) },
      { key: "BIO", label: "Mention BIO", count: countWhere((g) => g.BIO) },
    ];

    // Historique mensuel : sur la plage choisie, sinon les
    // DEFAULT_MONTHS_HISTORY derniers mois. Les mois vides sont conservés
    // pour garder une courbe continue.
    const rangeEnd = toDate ?? new Date();
    const rangeStart =
      fromDate ??
      new Date(
        rangeEnd.getFullYear(),
        rangeEnd.getMonth() - (DEFAULT_MONTHS_HISTORY - 1),
        1,
      );
    const months: GroupRow[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endCursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    while (cursor <= endCursor && months.length < MAX_MONTH_BUCKETS) {
      months.push({
        key: bucketKeyForDate(cursor, "month"),
        label: MONTH_FORMATTER.format(cursor),
        count: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const monthIndex = new Map(months.map((m) => [m.key, m]));
    generations.forEach((g) => {
      const bucket = monthIndex.get(bucketKeyForDate(new Date(g.CREDAT), "month"));
      if (bucket) bucket.count += 1;
    });

    // L'historique est tronqué aux GENERATIONS_LIMIT plus récentes : si la
    // limite est atteinte, les mois antérieurs à la plus ancienne génération
    // chargée sont incomplets — signalé sur la page.
    const isTruncated = generations.length >= GENERATIONS_LIMIT;
    const oldestLoaded = generations.length
      ? new Date(generations[generations.length - 1].CREDAT)
      : null;

    return {
      total: scoped.length,
      distinctUsers: new Set(scoped.map((g) => g.CREUSR)).size,
      distinctSheets: new Set(scoped.map((g) => g.SHTID)).size,
      validatedShare: scoped.length
        ? (countWhere((g) => g.SOURCE === "VALIDATED") / scoped.length) * 100
        : null,
      byTemplate,
      byUser,
      byLanguage,
      bySheet,
      options,
      byMonth: months,
      isTruncated,
      oldestLoaded,
    };
  }, [generations, fromDate, toDate, languages]);

  const templateStats = useMemo(
    () => ({
      activeCount: templates.filter((t) => t.ACTIVE).length,
      total: templates.length,
    }),
    [templates],
  );

  return {
    sheetStats,
    generationStats,
    templateStats,
    isLoading,
    hasError,
    loadedAt,
    reload,
  };
}
