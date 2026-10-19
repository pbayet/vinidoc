import React from "react";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { useNotification } from "@uvcdr/confirm-notify-system";
import SectionCard from "../../../shared/ui/SectionCard/ui/SectionCard";
import { useVinidoc } from "../context/VinidocContext";

/**
 * Catalogue des balises de fusion utilisables dans les modèles (source :
 * GET /vinidoc/merge-fields), avec copie en un clic.
 */
const MergeFieldsCatalog: React.FC = () => {
  const { mergeFields } = useVinidoc();
  const { notifySuccess } = useNotification();

  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => notifySuccess(`${text} copié`));
  };

  if (!mergeFields) return null;

  return (
    <SectionCard
      title="Balises de fusion"
      icon="code"
      className="section-grid--full"
      description={
        <>
          Texte : tapez la balise dans une zone de texte du modèle ; vous
          pouvez y indiquer la longueur max, ex.{" "}
          <code>{"{{APPELLATION-250}}"}</code> (même balise que{" "}
          <code>{"{{APPELLATION}}"}</code>, limite reprise à l'import). Image :
          nommez la forme <code>img:BOTTLEPHOTO</code>. Bloc conditionnel :
          nommez la forme (ou le groupe) <code>badge:&lt;BALISE&gt;</code> —
          elle est retirée si la condition est fausse. (PowerPoint : Accueil ›
          Organiser › Volet Sélection.)
        </>
      }
    >
      <div className="vd-table-wrapper">
        <table className="vd-table vd-table--compact">
          <thead>
            <tr>
              <th>Balise texte</th>
              <th>Contenu</th>
              <th>Traduit</th>
              <th className="vd-num">Max le + strict</th>
            </tr>
          </thead>
          <tbody>
            {mergeFields.TEXT.map((f) => (
              <tr key={f.TAG}>
                <td>
                  <button
                    type="button"
                    className="vd-copy"
                    title="Copier"
                    onClick={() => copy(`{{${f.TAG}}}`)}
                  >
                    <code>{`{{${f.TAG}}}`}</code> <Icon iconName="copy" />
                  </button>
                </td>
                <td>{f.LABEL}</td>
                <td>{f.TRANSLATED ? "Oui" : "—"}</td>
                <td className="vd-num">{f.MAXLEN ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="vd-two-cols">
        <div>
          <h5 className="vd-subtitle">Blocs conditionnels (badge:)</h5>
          <ul className="vd-plain-list">
            {mergeFields.BADGES.map((b) => (
              <li key={b.PATTERN}>
                <code>badge:{b.PATTERN}</code> — {b.LABEL}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h5 className="vd-subtitle">Images (img:)</h5>
          <ul className="vd-plain-list">
            {mergeFields.IMAGES.map((i) => (
              <li key={i.TAG}>
                <CustomButton
                  size="2xs"
                  variant="ghost"
                  rightIcon={<Icon iconName="copy" />}
                  onClick={() => copy(`img:${i.TAG}`)}
                >
                  img:{i.TAG}
                </CustomButton>{" "}
                — {i.LABEL}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
};

export default MergeFieldsCatalog;
