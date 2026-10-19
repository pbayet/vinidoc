import React from "react";
import { CustomButton, CustomInput, Icon } from "@uvcdr/custom-form-system";
import type { Grape } from "../../../entities/vinidoc/vinidoc.types";
import { toNumberOrNull } from "../lib/format";

interface GrapesEditorProps {
  value: Grape[];
  onChange: (value: Grape[]) => void;
  readOnly?: boolean;
}

const MAX_GRAPES = 20;

/** Liste ordonnée des cépages, pourcentage optionnel (total ≤ 100 %). */
const GrapesEditor: React.FC<GrapesEditorProps> = ({ value, onChange, readOnly }) => {
  const total = value.reduce((sum, g) => sum + (g.PCT ?? 0), 0);

  const update = (index: number, patch: Partial<Grape>) =>
    onChange(value.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="vd-grapes">
      <div className="vd-grapes__header">
        <span>Cépages</span>
        {value.some((g) => g.PCT != null) && (
          <span className={`vd-grapes__total${total > 100 ? " vd-grapes__total--over" : ""}`}>
            Total : {total} %
          </span>
        )}
      </div>

      {value.length === 0 && <p className="vd-muted">Aucun cépage renseigné.</p>}

      {value.map((grape, index) => (
        <div className="vd-grapes__row" key={index}>
          <CustomInput
            inputSize="sm"
            placeholder="Cépage (ex. Grenache)"
            value={grape.CEPAGE}
            maxLength={100}
            readOnly={readOnly}
            onChange={(e) => update(index, { CEPAGE: e.target.value })}
          />
          <CustomInput
            inputSize="sm"
            type="number"
            placeholder="%"
            min={0}
            max={100}
            value={grape.PCT ?? ""}
            readOnly={readOnly}
            className="vd-grapes__pct"
            onChange={(e) => update(index, { PCT: toNumberOrNull(e.target.value) })}
          />
          {!readOnly && (
            <div className="vd-grapes__actions">
              <CustomButton iconOnly size="xs" variant="ghost" title="Monter" disabled={index === 0} leftIcon={<Icon iconName="arrow-up" />} onClick={() => move(index, -1)} />
              <CustomButton iconOnly size="xs" variant="ghost" title="Descendre" disabled={index === value.length - 1} leftIcon={<Icon iconName="arrow-down" />} onClick={() => move(index, 1)} />
              <CustomButton iconOnly size="xs" variant="danger-ghost" title="Retirer" leftIcon={<Icon iconName="trash" />} onClick={() => onChange(value.filter((_, i) => i !== index))} />
            </div>
          )}
        </div>
      ))}

      {!readOnly && value.length < MAX_GRAPES && (
        <CustomButton
          size="xs"
          variant="outline"
          leftIcon={<Icon iconName="plus" />}
          onClick={() => onChange([...value, { CEPAGE: "", PCT: null }])}
        >
          Ajouter un cépage
        </CustomButton>
      )}
    </div>
  );
};

export default GrapesEditor;
