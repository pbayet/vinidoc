import React from "react";
import { CustomInput, Icon } from "@uvcdr/custom-form-system";
import type { LogisticsField } from "../../../entities/vinidoc/vinidoc.types";

/** Longueur max d'une donnée logistique corrigée (cf. API validators). */
const LOGISTICS_MAXLEN = 100;

/** Bouton d'action d'un CustomInput (type non exporté par le package). */
type InputButton = Extract<
  NonNullable<React.ComponentProps<typeof CustomInput>["customInputButton"]>,
  readonly unknown[]
>[number];

interface ArticleLogisticsProps {
  fields: LogisticsField[];
  /** Corrections saisies : balise LOG.* → valeur (absente = valeur de Sage X3) */
  overrides: Record<string, string>;
  onChange: (overrides: Record<string, string>) => void;
}

/**
 * Données logistiques de l'article PFI, injectées dans les balises
 * {{LOG.*}} du modèle. Les poids pleins et la hauteur de la palette chargée
 * sont calculés par Vinidoc à partir des poids à vide de Sage X3 (EF-16 /
 * EF-17) : le détail du calcul est affiché, ou la donnée manquante.
 *
 * Chaque valeur est modifiable avant la génération (donnée manquante ou
 * erronée dans Sage X3) : la correction ne vaut que pour cette génération,
 * Sage X3 n'est pas modifié.
 */
const ArticleLogistics: React.FC<ArticleLogisticsProps> = ({
  fields,
  overrides,
  onChange,
}) => {
  const valueOf = (f: LogisticsField) => overrides[f.TAG] ?? f.VALUE;
  const hasMissing = fields.some((f) => !valueOf(f).trim());
  const edited = fields.filter((f) => f.TAG in overrides).length;

  // Revenir à la valeur d'origine retire la correction.
  const setValue = (f: LogisticsField, value: string) => {
    const next = { ...overrides };
    if (value === f.VALUE) delete next[f.TAG];
    else next[f.TAG] = value;
    onChange(next);
  };
  const reset = (f: LogisticsField) => {
    const next = { ...overrides };
    delete next[f.TAG];
    onChange(next);
  };

  return (
    <div className="vd-logistics">
      <div className="vd-table-wrapper">
        <table className="vd-table vd-table--compact">
          <thead>
            <tr>
              <th>Donnée logistique</th>
              <th>Valeur</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const isEdited = f.TAG in overrides;
              // Corrigée : retour à Sage X3 + repère « corrigé » ;
              // sinon repère « calculé » pour les valeurs calculées.
              const buttons: InputButton[] = isEdited
                ? [
                    {
                      variant: "refresh",
                      ariaLabel: `Revenir à la valeur de Sage X3 : ${f.VALUE || "non renseignée"}`,
                      showIfEmpty: true,
                      onClick: () => reset(f),
                    },
                    {
                      icon: <Icon iconName="pen" />,
                      iconColor: { variant: "warning" },
                      ariaLabel: "Valeur corrigée pour cette génération",
                      showIfEmpty: true,
                    },
                  ]
                : f.CALCULATED
                  ? [
                      {
                        icon: <Icon iconName="calculator" />,
                        iconColor: { variant: "primary" },
                        ariaLabel: f.DETAIL ?? "Valeur calculée par Vinidoc",
                      },
                    ]
                  : [];

              return (
                <tr
                  key={f.TAG}
                  className={valueOf(f).trim() ? "" : "vd-row--warning"}
                >
                  <td>{f.LABEL}</td>
                  <td>
                    <CustomInput
                      aria-label={f.LABEL}
                      value={valueOf(f)}
                      maxLength={LOGISTICS_MAXLEN}
                      placeholder="Non renseigné — saisir la valeur"
                      onChange={(e) => setValue(f, e.target.value)}
                      inputSize="xs"
                      customInputButton={buttons.length ? buttons : undefined}
                    />
                    {!isEdited && f.CALCULATED && f.DETAIL && (
                      <div className="vd-muted vd-logistics__detail">
                        {f.DETAIL}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edited > 0 && (
        <p className="vd-muted">
          {edited} valeur{edited > 1 ? "s" : ""} corrigée{edited > 1 ? "s" : ""}{" "}
          pour cette génération uniquement (Sage X3 n'est pas modifié).
        </p>
      )}
      {hasMissing && (
        <p className="vd-muted">
          Données absentes : saisissez-les ci-dessus, sinon les champs concernés
          seront laissés vides.
        </p>
      )}
    </div>
  );
};

export default ArticleLogistics;
