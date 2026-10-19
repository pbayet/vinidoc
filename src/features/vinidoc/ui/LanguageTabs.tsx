import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type { Language } from "../../../entities/vinidoc/vinidoc.types";

interface LanguageTabsProps {
  languages: Language[];
  active: string;
  onChange: (lng: string) => void;
  /** Langues ayant déjà un texte (les autres sont affichées "à traduire") */
  present: string[];
  /** Langues avec des modifications non enregistrées */
  dirty?: string[];
}

/** Onglets de langue des textes d'une fiche. */
const LanguageTabs: React.FC<LanguageTabsProps> = ({ languages, active, onChange, present, dirty = [] }) => (
  <div className="vd-tabs" role="tablist">
    {languages.map((l) => {
      const has = present.includes(l.LNGCOD);
      return (
        <button
          key={l.LNGCOD}
          type="button"
          role="tab"
          aria-selected={active === l.LNGCOD}
          className={`vd-tabs__tab${active === l.LNGCOD ? " vd-tabs__tab--active" : ""}${has ? "" : " vd-tabs__tab--missing"}`}
          onClick={() => onChange(l.LNGCOD)}
          title={has ? l.LNGNAM : `${l.LNGNAM} — pas encore traduit`}
        >
          <span className="vd-tabs__code">{l.LNGCOD.toUpperCase()}</span>
          <span className="vd-tabs__name">{l.LNGNAM}</span>
          {l.ISDEFAULT && <Icon iconName="star" className="vd-tabs__default" />}
          {dirty.includes(l.LNGCOD) && <span className="vd-tabs__dirty" title="Modifications non enregistrées">●</span>}
          {!has && !dirty.includes(l.LNGCOD) && <Icon iconName="plus" className="vd-tabs__plus" />}
        </button>
      );
    })}
  </div>
);

export default LanguageTabs;
