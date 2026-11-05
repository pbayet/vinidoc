import React, { useMemo, useState } from "react";
import {
  VersionClass,
  VersionDetailClass,
  ChangeType,
} from "../../../../entities/application.class";
import { formatDate } from "../../../../shared/lib/utils/date.functions";
import { APP_NAME } from "../../../../app/config";
import "../styles/VersionModal.scss";
import { Modal } from "@uvcdr/modal";
import {
  Icon,
  CustomButton,
  CustomSelect,
  type SelectOption,
} from "@uvcdr/custom-form-system";
import { useAppVersionsHistory } from "../../hooks/useAppVersionsHistory";

interface VersionModalProps {
  isOpen: boolean;
  version: VersionClass;
  onClose: () => void;
}

const CHANGE_TYPES: ChangeType[] = [
  "ADDED",
  "UPDATED",
  "FIX",
  "REMOVE",
  "REFACTOR",
];

/** Icône (FontAwesome) associée à chaque type de changement. */
const CHANGE_TYPE_ICON: Record<ChangeType, string> = {
  ADDED: "circle-plus",
  UPDATED: "pen",
  FIX: "wrench",
  REMOVE: "trash",
  REFACTOR: "code-branch",
};

const VersionModal: React.FC<VersionModalProps> = ({
  isOpen,
  version: latestVersion,
  onClose,
}) => {
  // Historique complet (plus récente d'abord) pour consulter les nouveautés
  // des versions précédentes ; la dernière version (prop) reste affichée
  // tant que la liste n'est pas chargée.
  const versions = useAppVersionsHistory();
  const [selectedVID, setSelectedVID] = useState<number>(latestVersion.VID);

  const history = useMemo(
    () => (versions.length > 0 ? versions : [latestVersion]),
    [versions, latestVersion],
  );
  const selectedIndex = Math.max(
    0,
    history.findIndex((v) => v.VID === selectedVID),
  );
  const version = history[selectedIndex] ?? latestVersion;
  const isLatest = version.VID === history[0]?.VID;

  const versionOptions = useMemo<SelectOption[]>(
    () =>
      history.map((v, i) => ({
        type: "option",
        value: String(v.VID),
        label: `V${v.VNUM} — ${formatDate(v.RELEASEDTE || "", "date") ?? ""}${
          i === 0 ? " (actuelle)" : ""
        }`,
        keywords: [v.VNUM],
      })),
    [history],
  );
  const versionStrDate = useMemo(
    () => formatDate(version.RELEASEDTE || "", "str-date"),
    [version.RELEASEDTE],
  );

  const groupedChanges = useMemo(() => {
    const groups = CHANGE_TYPES.reduce<
      Record<ChangeType, VersionDetailClass[]>
    >(
      (acc, type) => ({ ...acc, [type]: [] }),
      {} as Record<ChangeType, VersionDetailClass[]>,
    );

    for (const change of version.orderedChanges) {
      if (change) groups[change.CTYPE].push(change);
    }

    return Object.entries(groups).filter(([, items]) => items.length > 0) as [
      ChangeType,
      VersionDetailClass[],
    ][];
  }, [version.orderedChanges]);

  const totalChangesCount = version.orderedChanges.length;

  return (
    <Modal
      isOpen={isOpen}
      title={`${APP_NAME} — Version ${version.VNUM}`}
      onClose={onClose}
      size="lg"
      lockBodyScroll={false}
      className={history.length > 1 ? "version-modal--fixed" : undefined}
    >
      {history.length > 1 && (
        <div className="version-picker">
          <CustomButton
            variant="ghost"
            size="xs"
            leftIcon={<Icon iconName="chevron-left" />}
            onClick={() => setSelectedVID(history[selectedIndex + 1].VID)}
            disabled={selectedIndex >= history.length - 1}
            aria-label="Version précédente"
            title="Version précédente"
          />
          <CustomSelect
            options={versionOptions}
            value={String(version.VID)}
            onChange={(value) => value && setSelectedVID(Number(value))}
            clearable={false}
            inputSize="xs"
            borderRadius="xs"
            className="version-picker__select"
          />
          <CustomButton
            variant="ghost"
            size="xs"
            leftIcon={<Icon iconName="chevron-right" />}
            onClick={() => setSelectedVID(history[selectedIndex - 1].VID)}
            disabled={selectedIndex === 0}
            aria-label="Version suivante"
            title="Version suivante"
          />
          {!isLatest && (
            <CustomButton
              variant="info-ghost"
              size="xs"
              onClick={() => setSelectedVID(history[0].VID)}
            >
              Revenir à la version actuelle
            </CustomButton>
          )}
        </div>
      )}

      <div className="version-meta">
        <div className="version-meta__item">
          <Icon iconName="user" className="version-meta__icon" />
          <span className="version-meta__label">Créé par</span>
          <span className="version-meta__value">
            {version.CREATED_BY.FSTNAM} {version.CREATED_BY.LSTNAM}
          </span>
        </div>

        <div className="version-meta__item">
          <Icon iconName="calendar-days" className="version-meta__icon" />
          <span className="version-meta__label">Date</span>
          <span className="version-meta__value">{versionStrDate}</span>
        </div>
      </div>

      {version.SUMMARY && (
        <div className="version-summary">
          <Icon iconName="align-left" className="version-summary__icon" />
          <p className="version-summary__text">{version.SUMMARY}</p>
        </div>
      )}

      <h3 className="changes-section-title">
        Les nouveautés
        {totalChangesCount > 0 && (
          <span className="changes-section-count">{totalChangesCount}</span>
        )}
      </h3>

      {groupedChanges.length === 0 ? (
        <p className="changes-empty">
          Aucune nouveauté n'est répertoriée pour cette version.
        </p>
      ) : (
        <ul className="changes-list">
          {groupedChanges.map(([type, items]) => (
            <li key={type} className="change-group">
              <div className="change-group-header">
                <span
                  className={`change-group-icon change-group-icon-${type.toLowerCase()}`}
                >
                  <Icon iconName={CHANGE_TYPE_ICON[type]} />
                </span>

                <h4
                  className={`change-group-title change-group-title-${type.toLowerCase()}`}
                >
                  {items[0].changesLabel}
                </h4>

                <span className="change-group-badge">{items.length}</span>
              </div>

              <ul className="change-group-items">
                {items.map((change) => (
                  <li
                    key={change.CID}
                    className={`change-item change-item-${type.toLowerCase()}`}
                  >
                    <h5 className="change-title">{change.CTITLE}</h5>
                    <p className="change-description">{change.CDESC}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default VersionModal;
