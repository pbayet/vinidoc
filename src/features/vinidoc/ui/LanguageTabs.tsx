import React from "react";
import { CustomButton, CustomButtonGroup, Icon } from "@uvcdr/custom-form-system";
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
  <CustomButtonGroup
    className="vd-tabs"
    menuStyle="tabs"
    size="sm"
    selectionMode="single"
    value={active}
    onValueChange={(v) => {
      if (typeof v === "string") onChange(v);
    }}
    aria-label="Langues"
  >
    {languages.map((l) => {
      const has = present.includes(l.LNGCOD);
      const isDirty = dirty.includes(l.LNGCOD);
      return (
        <CustomButton
          key={l.LNGCOD}
          value={l.LNGCOD}
          className={has ? undefined : "vd-tabs__tab--missing"}
          title={has ? l.LNGNAM : `${l.LNGNAM} — pas encore traduit`}
        >
          <span className="vd-tabs__code">{l.LNGCOD.toUpperCase()}</span>
          <span className="vd-tabs__name">{l.LNGNAM}</span>
          {l.ISDEFAULT && <Icon iconName="star" className="vd-tabs__default" />}
          {isDirty && <span className="vd-tabs__dirty" title="Modifications non enregistrées">●</span>}
          {!has && !isDirty && <Icon iconName="plus" className="vd-tabs__plus" />}
        </CustomButton>
      );
    })}
  </CustomButtonGroup>
);

export default LanguageTabs;
