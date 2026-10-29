import React from "react";
import { useFormContext } from "@uvcdr/custom-form-system";
import LimitedTextarea from "../ui/LimitedTextarea";
import type {
  Template,
  TemplateTag,
} from "../../../entities/vinidoc/vinidoc.types";
import { freeTagLabel, type GenerationFormValues } from "./generationValues";

/** Limite technique côté API (validators.TAG_MAXLEN_MAX) sans longueur max. */
const FREE_HARD_MAX = 10000;

/**
 * Un champ par balise libre {{FREE.*}} du modèle choisi. Longueur max et
 * caractère obligatoire : ceux de la balise (réglés dans Modèles, ou
 * {{FREE.MENTION_PROMO-130}} dans le PowerPoint). Saisie bloquée à la longueur max.
 */
const FreeFields: React.FC<{ template: Template; tags: TemplateTag[] }> = ({
  template,
  tags,
}) => {
  const { values, setFieldValue } = useFormContext<GenerationFormValues>();

  return (
    <div className="vd-free-fields">
      {tags.map((t) => (
        <LimitedTextarea
          key={t.TAGNAM}
          label={`${freeTagLabel(t.TAGNAM)}${t.REQUIRED ? " *" : ""}`}
          value={values.FREE[t.TAGNAM] ?? ""}
          onChange={(v) =>
            setFieldValue("FREE", { ...values.FREE, [t.TAGNAM]: v })
          }
          hardMax={t.MAXLEN ?? FREE_HARD_MAX}
          templateMax={t.MAXLEN}
          limits={[
            {
              TPLID: template.TPLID,
              TPLNAM: template.TPLNAM,
              MAXLEN: t.MAXLEN,
              REQUIRED: t.REQUIRED,
            },
          ]}
          rows={t.MAXLEN != null && t.MAXLEN <= 80 ? 1 : 3}
          hint={`{{${t.TAGNAM}}}${t.REQUIRED ? " — obligatoire" : ""}`}
        />
      ))}
    </div>
  );
};

export default FreeFields;
