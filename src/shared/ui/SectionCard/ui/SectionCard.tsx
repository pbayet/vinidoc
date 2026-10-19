import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import "../styles/SectionCard.scss";

interface SectionCardProps {
  /** Titre de la carte */
  title: string;
  /** Icône FontAwesome (Solid) affichée devant le titre */
  icon?: string;
  /** Texte d'introduction sous le titre */
  description?: React.ReactNode;
  /** Numéro d'étape affiché en pastille (parcours guidé) */
  step?: number;
  /** Éléments alignés à droite du titre (boutons…) */
  actions?: React.ReactNode;
  /** Contenu de la carte */
  children?: React.ReactNode;
  /** Classe CSS additionnelle */
  className?: string;
}

/**
 * Carte de section générique (titre + icône + description + contenu),
 * utilisée pour structurer les pages de VINIDOC.
 *
 * @example
 * <SectionCard title="Dégustation" icon="wine-glass" description="Œil, nez, bouche">
 *   …
 * </SectionCard>
 */
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  description,
  step,
  actions,
  children,
  className,
}) => {
  return (
    <section className={`section-card${className ? ` ${className}` : ""}`}>
      <header className="section-card__header">
        <h4 className="section-card__title">
          {step !== undefined && (
            <span className="section-card__step">{step}</span>
          )}
          {icon && step === undefined && (
            <span className="section-card__icon">
              <Icon iconName={icon} />
            </span>
          )}
          <span>{title}</span>
        </h4>
        {actions && <div className="section-card__actions">{actions}</div>}
      </header>

      {description && <p className="section-card__description">{description}</p>}

      {children && <div className="section-card__body">{children}</div>}
    </section>
  );
};

export default SectionCard;
