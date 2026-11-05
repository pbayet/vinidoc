import React, { useState } from "react";
import "../features/statistics/styles/Statistics.scss";
import PageLayout from "../shared/ui/PageLayout/PageLayout";
import {
  BarChart,
  LineChart,
  PieChart,
  ProgressBar,
  StatCard,
  StatCardGroup,
  StatsTable,
} from "@uvcdr/statistics-system";
import type { ProgressBarVariant } from "@uvcdr/statistics-system";
import { CustomButton, CustomInputDate, Icon } from "@uvcdr/custom-form-system";
import {
  GENERATIONS_LIMIT,
  GroupRow,
  useVinidocStats,
} from "../features/statistics/hooks/useVinidocStats";

/** Hauteur du graphique "Générations par mois". */
const MONTHLY_CHART_HEIGHT = 260;
/** Hauteur du graphique "Fiches par millésime". */
const VINTAGE_CHART_HEIGHT = 240;
/** Hauteur min. d'un graphique en barres horizontales, + hauteur par ligne. */
const BARCHART_MIN_HEIGHT = 140;
const BARCHART_ROW_HEIGHT = 34;
/** Diamètre des camemberts/donuts. */
const PIE_SIZE = 220;
/** Variantes des barres "Options de génération" (une par option, dans l'ordre). */
const OPTION_VARIANTS: Record<string, ProgressBarVariant> = {
  PDF: "danger",
  PPTX: "warning",
  VALIDATED: "success",
  ARTICLE: "info",
  HVE: "primary",
  BIO: "success",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" });
const LOADED_AT_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

interface ChartCardProps {
  title: string;
  icon: string;
  wide?: boolean;
  loading: boolean;
  empty?: boolean;
  emptyLabel?: string;
  /** Texte d'aide affiché sous le titre. */
  hint?: string;
  children: React.ReactNode;
}

/**
 * Carte habillant un graphique (titre + icône, squelette de chargement, état
 * vide) — même composant que la page Statistiques de ticketing : chaque
 * répartition choisit le graphique de @uvcdr/statistics-system le plus
 * adapté à la forme de ses données.
 */
const ChartCard: React.FC<ChartCardProps> = ({
  title,
  icon,
  wide = false,
  loading,
  empty = false,
  emptyLabel,
  hint,
  children,
}) => (
  <div
    className={`statistics-page__chart-card${
      wide ? " statistics-page__chart-card--wide" : ""
    }`}
  >
    <header className="statistics-page__chart-card-header">
      <Icon iconName={icon} />
      <span>{title}</span>
    </header>
    {hint && <p className="statistics-page__chart-hint">{hint}</p>}

    {loading ? (
      <div className="statistics-page__chart-skeleton" />
    ) : empty ? (
      <div className="statistics-page__chart-empty">
        <Icon iconName="circle-info" />
        <span>{emptyLabel}</span>
      </div>
    ) : (
      children
    )}
  </div>
);

/** Titre de section (fiches / générations). */
const SectionTitle: React.FC<{ icon: string; title: string; hint?: string }> = ({
  icon,
  title,
  hint,
}) => (
  <h2 className="statistics-page__section-title">
    <Icon iconName={icon} />
    <span>{title}</span>
    {hint && <small>{hint}</small>}
  </h2>
);

/** BarChart horizontal générique pour les classements (modèles, utilisateurs...). */
const RankingBarChart: React.FC<{ title: string; rows: GroupRow[] }> = ({
  title,
  rows,
}) => (
  <BarChart
    data={rows}
    label={(row) => row.label}
    series={[{ name: title, accessor: (row) => row.count }]}
    orientation="horizontal"
    height={Math.max(BARCHART_MIN_HEIGHT, rows.length * BARCHART_ROW_HEIGHT)}
    showLegend={false}
    showValues
  />
);

/** Contenu central d'un donut : total + libellé. */
const DonutCenter: React.FC<{ value: number; label: string }> = ({
  value,
  label,
}) => (
  <div className="statistics-page__donut-center">
    <strong>{value}</strong>
    <span>{label}</span>
  </div>
);

/**
 * Page "Statistiques" : vue d'ensemble de VINIDOC.
 *
 *  - Fiches œnologiques (état actuel) : volumétrie, avancement du workflow
 *    (brouillon → à valider → validée), anomalies de saisie, couverture des
 *    traductions, répartition par couleur, millésime et appellation.
 *  - Fiches techniques générées (sur la période choisie) : volumétrie,
 *    évolution mensuelle, modèles, utilisateurs, langues, fiches les plus
 *    générées et options de génération.
 *
 * Mise en page et composants repris des pages Statistiques des autres applis
 * UNIS (ticketing, FSA, users-manager) : StatCard/StatCardGroup pour les KPI
 * et, pour chaque répartition, le graphique le plus adapté :
 *  - statut / couleur / langue → PieChart (un tout en peu de catégories) ;
 *  - traductions / options → ProgressBar (part de chaque élément sur le total) ;
 *  - millésimes → BarChart vertical (axe ordonné) ;
 *  - modèles / utilisateurs / fiches → BarChart horizontal (classement) ;
 *  - appellations → StatsTable (libellés longs, recherche, export CSV) ;
 *  - tendance mensuelle → LineChart.
 *
 * Cf. `useVinidocStats` pour le chargement et le calcul des données.
 * Accès : tout utilisateur VINIDOC (hors accès restreint aux balises de
 * fusion, cf. PrivateRoute/useMergeFieldsOnly).
 */
const StatistiquesPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const {
    sheetStats,
    generationStats,
    templateStats,
    isLoading,
    hasError,
    loadedAt,
    reload,
  } = useVinidocStats(dateFrom, dateTo);

  const hasActiveFilters = !!dateFrom || !!dateTo;
  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const sheetTotal = Math.max(1, sheetStats.total);
  const generationTotal = Math.max(1, generationStats.total);
  const periodLabel = hasActiveFilters
    ? `${dateFrom ? `du ${DATE_FORMATTER.format(new Date(dateFrom))}` : ""}${
        dateFrom && dateTo ? " " : ""
      }${dateTo ? `au ${DATE_FORMATTER.format(new Date(dateTo))}` : ""}`
    : "toutes dates";

  return (
    <PageLayout title="Statistiques" showScrollToTop>
      <div className="statistics-page">
        <section
          className="statistics-page__toolbar"
          aria-label="Filtres des statistiques"
        >
          <div className="statistics-page__filter">
            <CustomInputDate
              label="Générations du"
              value={dateFrom}
              onChange={setDateFrom}
              max={dateTo || undefined}
              inputSize="xs"
            />
          </div>

          <div className="statistics-page__filter">
            <CustomInputDate
              label="Au"
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom || undefined}
              inputSize="xs"
            />
          </div>

          <CustomButton
            variant="danger-outline"
            size="xs"
            leftIcon={<Icon iconName="filter-circle-xmark" />}
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Réinitialiser
          </CustomButton>

          <div className="statistics-page__toolbar-spacer" />

          {loadedAt && (
            <span className="statistics-page__loaded-at">
              Données du {LOADED_AT_FORMATTER.format(loadedAt)}
            </span>
          )}
          <CustomButton
            variant="outline"
            size="xs"
            leftIcon={<Icon iconName="rotate-right" />}
            onClick={reload}
            disabled={isLoading}
          >
            Actualiser
          </CustomButton>
        </section>

        {hasError && (
          <div className="statistics-page__alert">
            <Icon iconName="triangle-exclamation" />
            <span>
              Impossible de charger les statistiques. Réessayez avec
              « Actualiser ».
            </span>
          </div>
        )}

        {/* ───────────────────── Fiches œnologiques ───────────────────── */}

        <SectionTitle
          icon="wine-bottle"
          title="Fiches œnologiques"
          hint="état actuel, toutes fiches non supprimées"
        />

        <StatCardGroup columns={6} className="statistics-page__kpis">
          <StatCard
            icon={<Icon iconName="wine-bottle" />}
            label="Fiches œnologiques"
            value={sheetStats.total}
            loading={isLoading}
            variant="primary"
          />
          <StatCard
            icon={<Icon iconName="pen" />}
            label="Brouillons"
            value={sheetStats.draftCount}
            loading={isLoading}
            variant="info"
          />
          <StatCard
            icon={<Icon iconName="hourglass-half" />}
            label="À valider"
            value={sheetStats.submittedCount}
            loading={isLoading}
            variant="warning"
            tooltip="Fiches soumises en attente de validation marketing"
          />
          <StatCard
            icon={<Icon iconName="circle-check" />}
            label="Validées"
            value={sheetStats.validatedCount}
            description={
              sheetStats.validationRate !== null
                ? `${sheetStats.validationRate.toFixed(0)} % des fiches`
                : undefined
            }
            loading={isLoading}
            variant="success"
          />
          <StatCard
            icon={<Icon iconName="file-powerpoint" />}
            label="Générables (version validée)"
            value={sheetStats.generableCount}
            loading={isLoading}
            variant="neutral"
            tooltip="Fiches disposant d'au moins une version validée, quel que soit leur statut actuel"
          />
          <StatCard
            icon={<Icon iconName="triangle-exclamation" />}
            label="Avec anomalies de saisie"
            value={sheetStats.withIssuesCount}
            loading={isLoading}
            variant="danger"
            tooltip="Traduction de la langue par défaut absente, texte trop long ou balise obligatoire vide au regard des modèles actifs"
          />
        </StatCardGroup>

        <div className="statistics-page__grid">
          <ChartCard
            title="Avancement du workflow"
            icon="chart-pie"
            loading={isLoading}
            empty={!sheetStats.byStatus.length}
            emptyLabel="Aucune fiche œnologique."
          >
            <PieChart
              data={sheetStats.byStatus}
              label={(row) => row.label}
              value={(row) => row.count}
              color={(row) => row.color ?? "var(--stat-color-muted)"}
              size={PIE_SIZE}
              showLegend
              showPercentLabels
            />
          </ChartCard>

          <ChartCard
            title="Couverture des traductions"
            icon="language"
            hint="Fiches ayant des textes saisis dans chaque langue active"
            loading={isLoading}
            empty={!sheetStats.languageCoverage.length}
            emptyLabel="Aucune langue active."
          >
            <div className="statistics-page__progress-stack">
              {sheetStats.languageCoverage.map((row) => (
                <ProgressBar
                  key={row.code}
                  label={`${row.label}${row.isDefault ? " (par défaut)" : ""}`}
                  value={row.count}
                  max={sheetTotal}
                  variant={row.isDefault ? "primary" : "info"}
                  valueDisplay="both"
                />
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Répartition par couleur"
            icon="droplet"
            loading={isLoading}
            empty={!sheetStats.byColor.length}
            emptyLabel="Aucune fiche œnologique."
          >
            <PieChart
              data={sheetStats.byColor}
              label={(row) => row.label}
              value={(row) => row.count}
              color={(row) => row.color ?? "var(--stat-color-muted)"}
              innerRadiusRatio={0.6}
              size={PIE_SIZE}
              showLegend
              centerContent={
                <DonutCenter value={sheetStats.total} label="fiches" />
              }
            />
          </ChartCard>

          <ChartCard
            title="Fiches par millésime"
            icon="calendar"
            loading={isLoading}
            empty={!sheetStats.byVintage.length}
            emptyLabel="Aucune fiche œnologique."
          >
            <BarChart
              data={sheetStats.byVintage}
              label={(row) => row.label}
              series={[{ name: "Fiches", accessor: (row) => row.count }]}
              height={VINTAGE_CHART_HEIGHT}
              colorByCategory={false}
              showLegend={false}
              showValues
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Fiches par appellation"
          icon="map-location-dot"
          wide
          loading={isLoading}
          empty={!sheetStats.byAppellation.length}
          emptyLabel="Aucune appellation renseignée."
        >
          <StatsTable
            data={sheetStats.byAppellation}
            groupBy={(row) => row.label}
            groupHeader="Appellation"
            value={(row) => row.count}
            columns={[{ aggregate: "sum", header: "Fiches", showShare: true }]}
            defaultSort="sum"
            defaultSortDirection="desc"
            showTotalRow
            searchable
            pageSize={10}
            exportable
            exportFilename="vinidoc-fiches-par-appellation"
          />
        </ChartCard>

        {/* ───────────────────── Générations ───────────────────── */}

        <SectionTitle
          icon="file-powerpoint"
          title="Fiches techniques générées"
          hint={periodLabel}
        />

        {!isLoading && generationStats.isTruncated && (
          <div className="statistics-page__notice">
            <Icon iconName="circle-info" />
            <span>
              Statistiques calculées sur les {GENERATIONS_LIMIT} générations
              les plus récentes
              {generationStats.oldestLoaded
                ? ` (depuis le ${DATE_FORMATTER.format(generationStats.oldestLoaded)})`
                : ""}
              : les périodes antérieures sont incomplètes.
            </span>
          </div>
        )}

        <StatCardGroup columns={5} className="statistics-page__kpis">
          <StatCard
            icon={<Icon iconName="file-export" />}
            label="Générations sur la période"
            value={generationStats.total}
            loading={isLoading}
            variant="primary"
          />
          <StatCard
            icon={<Icon iconName="wine-glass" />}
            label="Fiches œnologiques utilisées"
            value={generationStats.distinctSheets}
            loading={isLoading}
            variant="info"
          />
          <StatCard
            icon={<Icon iconName="users" />}
            label="Utilisateurs"
            value={generationStats.distinctUsers}
            loading={isLoading}
            variant="neutral"
          />
          <StatCard
            icon={<Icon iconName="shield-halved" />}
            label="Sur contenu validé"
            value={generationStats.validatedShare ?? "—"}
            suffix={generationStats.validatedShare !== null ? " %" : undefined}
            decimals={0}
            loading={isLoading}
            variant="success"
            tooltip="Part des générations faites à partir de la dernière version validée par le marketing (le reste utilise la saisie en cours)"
          />
          <StatCard
            icon={<Icon iconName="object-group" />}
            label="Modèles actifs"
            value={templateStats.activeCount}
            description={`sur ${templateStats.total} modèle${templateStats.total > 1 ? "s" : ""}`}
            loading={isLoading}
            variant="warning"
          />
        </StatCardGroup>

        <ChartCard
          title="Générations par mois"
          icon="calendar-days"
          wide
          loading={isLoading}
        >
          <LineChart
            data={generationStats.byMonth}
            label={(row) => row.label}
            series={[{ name: "Générations", accessor: (row) => row.count }]}
            height={MONTHLY_CHART_HEIGHT}
            area
            smooth
            showDots
          />
        </ChartCard>

        <div className="statistics-page__grid">
          <ChartCard
            title="Top modèles utilisés"
            icon="object-group"
            loading={isLoading}
            empty={!generationStats.byTemplate.length}
            emptyLabel="Aucune génération sur la période."
          >
            <RankingBarChart
              title="Générations"
              rows={generationStats.byTemplate}
            />
          </ChartCard>

          <ChartCard
            title="Top utilisateurs"
            icon="user"
            loading={isLoading}
            empty={!generationStats.byUser.length}
            emptyLabel="Aucune génération sur la période."
          >
            <RankingBarChart
              title="Générations"
              rows={generationStats.byUser}
            />
          </ChartCard>

          <ChartCard
            title="Langues générées"
            icon="language"
            loading={isLoading}
            empty={!generationStats.byLanguage.length}
            emptyLabel="Aucune génération sur la période."
          >
            <PieChart
              data={generationStats.byLanguage}
              label={(row) => row.label}
              value={(row) => row.count}
              innerRadiusRatio={0.6}
              size={PIE_SIZE}
              maxSlices={6}
              showLegend
              centerContent={
                <DonutCenter
                  value={generationStats.total}
                  label="générations"
                />
              }
            />
          </ChartCard>

          <ChartCard
            title="Options de génération"
            icon="sliders"
            hint="Part des générations de la période"
            loading={isLoading}
            empty={!generationStats.total}
            emptyLabel="Aucune génération sur la période."
          >
            <div className="statistics-page__progress-stack">
              {generationStats.options.map((row) => (
                <ProgressBar
                  key={row.key}
                  label={row.label}
                  value={row.count}
                  max={generationTotal}
                  variant={OPTION_VARIANTS[row.key] ?? "primary"}
                  valueDisplay="both"
                />
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Fiches les plus générées"
            icon="ranking-star"
            wide
            loading={isLoading}
            empty={!generationStats.bySheet.length}
            emptyLabel="Aucune génération sur la période."
          >
            <RankingBarChart
              title="Générations"
              rows={generationStats.bySheet}
            />
          </ChartCard>
        </div>
      </div>
    </PageLayout>
  );
};

export default StatistiquesPage;
