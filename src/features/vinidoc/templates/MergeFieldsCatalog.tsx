import React, { useMemo, useState } from "react";
import {
  CustomFormSection,
  CustomInput,
  Icon,
} from "@uvcdr/custom-form-system";
import { useNotification } from "@uvcdr/confirm-notify-system";
import { useVinidoc } from "../context/VinidocContext";
import type {
  BadgeMergeField,
  TextMergeField,
} from "../../../entities/vinidoc/vinidoc.types";
import { useMergeFieldsOnly } from "../../auth/hooks/useMergeFieldsOnly";

/** Nom copiable d'une balise (clic = copie dans le presse-papiers). */
const CopyTag: React.FC<{ text: string; onCopy: (text: string) => void }> = ({
  text,
  onCopy,
}) => (
  <button
    type="button"
    className="vd-copy vd-tag-chip"
    title={`Copier ${text}`}
    onClick={() => onCopy(text)}
  >
    <code>{text}</code>
    <Icon iconName="copy" />
  </button>
);

/** Mode d'emploi d'un type de balise. */
const HOW_TO: {
  icon: string;
  title: string;
  where: React.ReactNode;
  example: string;
}[] = [
  {
    icon: "font",
    title: "Texte",
    where: (
      <>
        Tapez la balise dans une zone de texte. Longueur max facultative :{" "}
        <code>{"{{DEGUST-250}}"}</code> (même balise que{" "}
        <code>{"{{DEGUST}}"}</code>, limite reprise à l'import).
      </>
    ),
    example: "{{DEGUST}}",
  },
  {
    icon: "keyboard",
    title: "Champ libre",
    where: (
      <>
        <code>{"{{FREE.<NOM>}}"}</code> dans une zone de texte : un champ à
        saisir à la génération, intitulé d'après le nom (
        <code>FREE.PRIX_PUBLIC</code> → « Prix public »).
      </>
    ),
    example: "{{FREE.PRIX_PUBLIC-30}}",
  },
  {
    icon: "image",
    title: "Image",
    where: (
      <>
        Nommez l'image <code>img:&lt;BALISE&gt;</code> dans le Volet Sélection :
        elle est remplacée sans être rognée.
      </>
    ),
    example: "img:BOTTLEPHOTO",
  },
  {
    icon: "eye-slash",
    title: "Bloc conditionnel",
    where: (
      <>
        Nommez la forme ou le groupe <code>badge:&lt;NOM&gt;</code> dans le
        Volet Sélection : il est retiré si la condition est fausse.
      </>
    ),
    example: "badge:COULEUR_ROUGE",
  },
];

const matches = (search: string, ...texts: (string | null | undefined)[]) =>
  !search || texts.some((t) => t?.toLowerCase().includes(search.toLowerCase()));

/**
 * Catalogue des balises de fusion utilisables dans les modèles (source :
 * GET /vinidoc/merge-fields) : mode d'emploi par type, puis toutes les
 * balises regroupées (fiche, logistique, champs libres, images, blocs
 * conditionnels), filtrables et copiables en un clic.
 */
const MergeFieldsCatalog: React.FC = () => {
  const { mergeFields } = useVinidoc();
  const { notifySuccess } = useNotification();
  const [search, setSearch] = useState("");

  const isMergeFieldsOnly = useMergeFieldsOnly();

  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => notifySuccess(`${text} copié`));
  };

  const q = search.trim();
  const { sheet, logistics, images, badgeGroups } = useMemo(() => {
    const text = (mergeFields?.TEXT ?? []).filter((f) =>
      matches(q, f.TAG, f.LABEL),
    );
    const groups = new Map<string, BadgeMergeField[]>();
    for (const b of mergeFields?.BADGES ?? []) {
      if (!matches(q, b.GROUP, b.LABEL, b.PATTERN, ...(b.NAMES ?? [])))
        continue;
      groups.set(b.GROUP, [...(groups.get(b.GROUP) ?? []), b]);
    }
    return {
      sheet: text.filter((f) => !f.TAG.startsWith("LOG.")),
      logistics: text.filter((f) => f.TAG.startsWith("LOG.")),
      images: (mergeFields?.IMAGES ?? []).filter((i) =>
        matches(q, i.TAG, i.LABEL),
      ),
      badgeGroups: [...groups],
    };
  }, [mergeFields, q]);

  if (!mergeFields) return null;

  const showFree = matches(q, "FREE", "champ libre");
  const empty =
    !sheet.length &&
    !logistics.length &&
    !images.length &&
    !badgeGroups.length &&
    !showFree;

  const textTable = (fields: TextMergeField[], withTranslated: boolean) => (
    <div className="vd-table-wrapper">
      <table className="vd-table vd-table--compact vd-catalog__table">
        <thead>
          <tr>
            <th>Balise</th>
            <th>Contenu</th>
            {withTranslated && <th>Langue</th>}
            <th
              className="vd-num"
              title="Longueur max la plus stricte parmi les modèles actifs qui utilisent la balise"
            >
              Max
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.TAG}>
              <td>
                <CopyTag text={`{{${f.TAG}}}`} onCopy={copy} />
              </td>
              <td>
                {f.LABEL.replace(/ \(logistique — .*\)$/, "")}
                {f.OPTIONAL && (
                  <span
                    className="vd-chip vd-chip--muted vd-catalog__flag"
                    title="Jamais signalée comme absente d'un modèle"
                  >
                    facultative
                  </span>
                )}
              </td>
              {withTranslated && (
                <td>
                  {f.TRANSLATED ? (
                    <span className="vd-chip vd-chip--info">
                      <Icon iconName="language" /> traduit
                    </span>
                  ) : (
                    <span className="vd-muted">toutes</span>
                  )}
                </td>
              )}
              <td
                className="vd-num"
                title={
                  f.LIMITS.length
                    ? f.LIMITS.map(
                        (l) =>
                          `${l.TPLNAM} : ${l.MAXLEN ?? "illimité"}${l.REQUIRED ? " (obligatoire)" : ""}`,
                      ).join("\n")
                    : "Utilisée par aucun modèle actif"
                }
              >
                {f.MAXLEN ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <CustomFormSection
      title="Balises de fusion"
      icon={<Icon iconName="code" />}
      className="section-grid--full"
      description="Tout ce qui peut être placé dans un modèle PowerPoint. Cliquez sur une balise pour la copier. Formes et images se nomment dans PowerPoint : Accueil › Organiser › Volet Sélection."
      retractable
      defaultRetracted={!isMergeFieldsOnly}
    >
      <div className="vd-catalog">
        <div className="vd-catalog__howto">
          {HOW_TO.map((h) => (
            <div key={h.title} className="vd-catalog__howto-card">
              <strong>
                <Icon iconName={h.icon} /> {h.title}
              </strong>
              <p>{h.where}</p>
              <CopyTag text={h.example} onCopy={copy} />
            </div>
          ))}
        </div>

        <CustomInput
          aria-label="Rechercher une balise"
          placeholder="Rechercher une balise (nom ou contenu)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          inputSize="xs"
          customInputButton={{ variant: "clear", onClick: () => setSearch("") }}
        />

        {empty && <p className="vd-muted">Aucune balise ne correspond.</p>}

        {sheet.length > 0 && (
          <section>
            <h5 className="vd-subtitle">
              <Icon iconName="wine-bottle" /> Textes de la fiche œnologique
            </h5>
            {textTable(sheet, true)}
          </section>
        )}

        {logistics.length > 0 && (
          <section>
            <h5 className="vd-subtitle">
              <Icon iconName="truck" /> Données logistiques (article PFI)
            </h5>
            <p className="vd-muted vd-catalog__hint">
              Alimentées par l'article PFI choisi à la génération, corrigeables
              avant de générer.
            </p>
            {textTable(logistics, false)}
          </section>
        )}

        {showFree && (
          <section>
            <h5 className="vd-subtitle">
              <Icon iconName="keyboard" /> Champs libres
            </h5>
            <p className="vd-muted vd-catalog__hint">
              Nom au choix après <code>FREE.</code> (lettres, chiffres, « _ ») :
              un champ par balise apparaît dans le formulaire de génération.
              Longueur max et caractère obligatoire se règlent comme pour les
              autres balises.
            </p>
            <div className="vd-catalog__chips">
              {["{{FREE.PRIX}}", "{{FREE.MENTION_PROMO-130}}"].map((t) => (
                <CopyTag key={t} text={t} onCopy={copy} />
              ))}
            </div>
          </section>
        )}

        {images.length > 0 && (
          <section>
            <h5 className="vd-subtitle">
              <Icon iconName="image" /> Images
            </h5>
            <ul className="vd-catalog__list">
              {images.map((i) => (
                <li key={i.TAG}>
                  <CopyTag text={`img:${i.TAG}`} onCopy={copy} />
                  <span>{i.LABEL}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {badgeGroups.length > 0 && (
          <section>
            <h5 className="vd-subtitle">
              <Icon iconName="eye-slash" /> Blocs conditionnels
            </h5>
            <div className="vd-catalog__badges">
              {badgeGroups.map(([group, badges]) => (
                <div key={group} className="vd-catalog__badge-group">
                  <strong>{group}</strong>
                  {badges.map((b) => (
                    <div key={b.PATTERN} className="vd-catalog__badge">
                      <span className="vd-muted">{b.LABEL}</span>
                      <div className="vd-catalog__chips">
                        {(b.NAMES ?? [b.PATTERN]).map((n) => (
                          <CopyTag key={n} text={`badge:${n}`} onCopy={copy} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </CustomFormSection>
  );
};

export default MergeFieldsCatalog;
