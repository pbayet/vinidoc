import React, { useRef, useState, useCallback } from "react";
import "./PageLayout.scss";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";

interface PageLayoutProps {
  /** Titre affiché en haut, figé au scroll */
  title: string;
  /** Contenu scrollable de la page */
  children: React.ReactNode;
  /** Éléments optionnels alignés à droite du titre (boutons, badges…) */
  actions?: React.ReactNode;
  /** Classe CSS additionnelle sur le wrapper racine */
  className?: string;
  /** Affiche le bouton "retour en haut" (défaut : true) */
  showScrollToTop?: boolean;
}

/**
 * Layout générique pour toutes les pages de l'application.
 *
 * - Prend tout l'espace restant dans le flex-parent (.body)
 * - Titre figé en haut (sticky)
 * - Zone de contenu scrollable
 * - Bouton optionnel pour remonter en haut (showScrollToTop, défaut : true)
 *
 * @example
 * <PageLayout title="Dossiers en cours" actions={<SomeButton />}>
 *   <p>Contenu de la page…</p>
 * </PageLayout>
 */
const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  children,
  actions,
  className,
  showScrollToTop = false,
}) => {
  const contentRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    setIsScrolled((contentRef.current?.scrollTop ?? 0) > 200);
  }, []);

  const scrollToTop = useCallback(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className={`page-layout${className ? ` ${className}` : ""}`}>
      <header className="page-layout__header">
        <h3 className="page-layout__title">
          <span>{title}</span>
        </h3>
        {actions && <div className="page-layout__actions">{actions}</div>}
      </header>

      <main
        ref={contentRef}
        className="page-layout__content"
        onScroll={showScrollToTop ? handleScroll : undefined}
      >
        {children}

        {showScrollToTop && isScrolled && (
          <CustomButton
            className="page-layout__scroll-top"
            iconOnly
            leftIcon={<Icon iconName="arrow-up" />}
            onClick={scrollToTop}
            size="md"
          ></CustomButton>
        )}
      </main>
    </div>
  );
};

export default PageLayout;
