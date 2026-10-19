import React from "react";

/** Pastille numérotée affichée devant le titre d'une étape (CustomFormSection `icon`). */
const StepBadge: React.FC<{ step: number }> = ({ step }) => (
  <span className="vd-generate__step" aria-hidden>
    {step}
  </span>
);

export default StepBadge;
