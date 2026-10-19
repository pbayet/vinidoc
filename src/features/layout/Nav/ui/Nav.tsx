import React, { useState } from "react";
import "../styles/Nav.scss";
import { useLocation, useNavigate } from "react-router-dom";
import appIcon from "../../../../assets/icon.png";
import { APP_NAME, IS_PRODUCTION } from "../../../../app/config";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import { useAuth } from "@uvcdr/api-auth-system";
import SwitchUserModal from "./SwitchUserModal";
import VersionModal from "./VersionModal";
import { useSwitchUser } from "../hooks/useSwitchUser";
import { useAppVersion } from "../../hooks/useAppVersion";
import { useConfirm } from "@uvcdr/confirm-notify-system";
import AppSwitcherModal from "./AppSwitcherModal";
import { useVinidoc } from "../../../vinidoc/context/VinidocContext";

// Exportée : réutilisée par une éventuelle page de paramètres qui écrirait
// directement dans cette même clé plutôt que d'en dupliquer une seconde.
const NAV_STORAGE_KEY = `uvcdr-app-${APP_NAME}-nav-opened`;

interface NavItem {
  label: string;
  icon: string;
  path: string;
  isActive: (pathname: string) => boolean;
  show?: boolean;
  /** Pastille numérique (ex. fiches à valider) */
  badge?: number;
}

interface NavSection {
  /** Titre affiché au-dessus des boutons de la section (facultatif). */
  title?: string;
  items: NavItem[];
}

interface NavProps {
  /** Titre affiché en haut du volet, à côté du bouton de rétractation (visible seulement volet ouvert). */
  title?: string;
  /** Icône affichée devant le titre. */
  titleIcon?: string;
  /**
   * Téléphone (< 768px) uniquement : la nav devient un tiroir masqué par
   * défaut (cf. Nav.scss). `mobileOpen` pilote son ouverture, déclenchée par
   * un futur bouton hamburger de PageLayout. Sans effet sur
   * ordinateur/tablette, où la nav reste toujours visible.
   */
  mobileOpen?: boolean;
  /** Referme le tiroir mobile (clic sur le fond, une entrée, ou le bouton ✕). */
  onCloseMobile?: () => void;
}

function userInitials(u: {
  first_name?: string | null;
  last_name?: string | null;
  username: string;
}): string {
  if (u.first_name || u.last_name) {
    return (
      `${u.first_name?.[0] ?? ""}${u.last_name?.[0] ?? ""}`.toUpperCase() ||
      u.username.slice(0, 2).toUpperCase()
    );
  }
  return u.username.slice(0, 2).toUpperCase();
}

const Nav: React.FC<NavProps> = ({
  title = APP_NAME,
  titleIcon = "wine-glass",
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const { jwtPayload, logout } = useAuth();

  // Visibilité des entrées : droits VINIDOC renvoyés par l'API
  // (GET /vinidoc/me — œnologie, marketing, modèles). Même signal que
  // `requireRight` sur les <Route> correspondantes de router.tsx : un
  // utilisateur sans ce droit ne voit ni les liens, ni les pages si
  // atteintes directement par URL.
  const { rights, pendingCount } = useVinidoc();
  const [isAppSwitcherModalOpen, setAppSwitcherModalOpen] = useState(false);

  // Changement d'utilisateur (admin uniquement) : `isAdmin` gouverne
  // l'affichage des boutons/du modal, `isImpersonating` celui du bouton de
  // retour rapide (inutile si on est déjà sur son propre compte),
  // `resetToBaseUser` appelle directement `auth/dev` sans passer par le modal.
  const {
    isAdmin,
    isImpersonating,
    isLoading: isSwitchUserLoading,
    resetToBaseUser,
  } = useSwitchUser();

  // Numéro de version (badge, cf. footer ci-dessous) — même source que
  // l'ancien bouton de version du Header (`useAppVersion`).
  const {
    version,
    versionLabel,
    isVersionModalOpen,
    openVersionModal,
    closeVersionModal,
  } = useAppVersion();

  const NAV_SECTIONS: NavSection[] = [
    {
      items: [
        {
          label: "Fiches techniques",
          icon: "file-powerpoint",
          path: "/",
          isActive: (p) => p === "/",
        },
        {
          label: "Fiches œnologiques",
          icon: "wine-bottle",
          path: "/oenologie",
          isActive: (p) => p === "/oenologie" || p.startsWith("/oenologie/"),
          badge: rights.VALIDATE ? pendingCount : undefined,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "Modèles PowerPoint",
          icon: "object-group",
          path: "/modeles",
          isActive: (p) => p === "/modeles" || p.startsWith("/modeles/"),
          show: rights.TEMPLATES,
        },
      ],
    },
    {
      items: [
        {
          label: "Paramètres",
          icon: "gear",
          path: "/parametres",
          isActive: (p) => p === "/parametres",
        },
      ],
    },
  ];

  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(NAV_STORAGE_KEY) === "false"
      ? false
      : localStorage.getItem(NAV_STORAGE_KEY) === "true" || true;
  });

  const [isOpenLogout, setIsOpenLogout] = useState<boolean>(isOpen);
  const [isSwitchUserModalOpen, setSwitchUserModalOpen] = useState(false);

  const toggleNav = () => {
    if (!isOpen) {
      setTimeout(() => {
        setIsOpenLogout((prev) => {
          const next = !prev;
          return next;
        });
      }, 100);
    } else {
      setIsOpenLogout((prev) => {
        const next = !prev;
        return next;
      });
    }

    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(NAV_STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: IS_PRODUCTION ? "Retour au portail" : "Confirmer la déconnexion",
      description: IS_PRODUCTION
        ? "Voulez-vous vraiment quitter l’application et retourner au portail ?"
        : "Voulez-vous vraiment vous déconnecter ?",
      type: "confirmcancel",
    });

    if (!confirmed) return;

    await logout();
  };

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.show === undefined || item.show),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={`nav-sidebar${isOpen ? " open" : " closed"}${mobileOpen ? " mobile-open" : ""}${isImpersonating ? " impersonating" : ""}`}
    >
      {/* En-tête : titre + icône, et bouton de rétractation (téléphone :
          referme le tiroir à la place) */}
      <div className="nav-sidebar__header">
        {(title || titleIcon) && (
          <div className="nav-sidebar__brand">
            {titleIcon && (
              <span className="nav-sidebar__brand-icon">
                <Icon iconName={titleIcon} />
              </span>
            )}
            {title && <span className="nav-sidebar__brand-title">{title}</span>}
          </div>
        )}

        <button
          className="nav-sidebar__toggle-btn"
          onClick={() => {
            if (mobileOpen) {
              onCloseMobile?.();
            } else toggleNav();
          }}
          aria-label={
            mobileOpen
              ? "Fermer la navigation"
              : isOpen
                ? "Réduire la navigation"
                : "Déplier la navigation"
          }
        >
          <Icon
            iconName={
              mobileOpen ? "xmark" : isOpen ? "chevron-left" : "chevron-right"
            }
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="nav-sidebar__nav" aria-label="Navigation principale">
        {visibleSections.map((section, index) => (
          <div className="nav-sidebar__section" key={section.title ?? index}>
            {section.title && (
              <div className="nav-sidebar__section-title">{section.title}</div>
            )}
            {section.items.map((item) => {
              const active = item.isActive(pathname);

              return (
                <button
                  key={item.path}
                  className={`nav-sidebar__item${active ? " active" : ""}`}
                  onClick={() => {
                    navigate(item.path);
                    onCloseMobile?.();
                  }}
                  title={!isOpen ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="nav-sidebar__item-icon">
                    <Icon iconName={item.icon} />
                  </span>
                  <span className="nav-sidebar__item-label">{item.label}</span>
                  {!!item.badge && (
                    <span
                      className="nav-sidebar__item-badge"
                      title={`${item.badge} en attente`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Pied : utilisateur connecté + déconnexion */}
      {jwtPayload && (
        <>
          {/* Badge de version */}
          {version && (
            <button
              type="button"
              className={`nav-sidebar__version-badge nav-sidebar__version-badge--footer${
                version.haveNotification
                  ? " nav-sidebar__version-badge--notif"
                  : ""
              }`}
              onClick={openVersionModal}
              title="Voir les nouveautés"
            >
              {versionLabel}
            </button>
          )}

          <div className="nav-sidebar__footer">
            <div className="nav-sidebar__footer-logo">
              {/* Icône + nom recréé en texte, sur un même fond clair (comme
                  le fond blanc du logo d'origine) : icône seule volet
                  réduit, icône + texte volet ouvert. */}
              <div className="nav-sidebar__footer-logo-content">
                <img
                  src={appIcon}
                  alt="Union des vignerons des Côtes du Rhône"
                  className="nav-sidebar__footer-logo-img"
                />

                {isOpen && (
                  <span className="nav-sidebar__footer-logo-text">
                    Union des vignerons
                    <br />
                    des Côtes du Rhône
                  </span>
                )}
              </div>
            </div>

            <div
              className="nav-sidebar__user"
              title={!isOpen ? jwtPayload.$fullNameReverse : undefined}
            >
              <span className="nav-sidebar__user-avatar">
                {userInitials({
                  first_name: jwtPayload.$payload.data.FirstName,
                  last_name: jwtPayload.$payload.data.LastName,
                  username: jwtPayload.$fullNameReverse,
                })}
              </span>
              <span className="nav-sidebar__user-name">
                {jwtPayload.$fullNameReverse}
              </span>
            </div>
            {isAdmin && (
              <div
                className={`change-user-btns change-user-btns${isOpenLogout ? "__open" : ""}`}
              >
                <CustomButton
                  leftIcon={<Icon iconName="user-pen" />}
                  iconOnly={!isOpenLogout && !mobileOpen}
                  variant="neutral"
                  size="xs"
                  onClick={() => setSwitchUserModalOpen(true)}
                >
                  Changer d'utilisateur
                </CustomButton>

                {isImpersonating && (
                  <CustomButton
                    leftIcon={<Icon iconName="rotate-right" />}
                    iconOnly={!isOpenLogout && !mobileOpen}
                    variant="secondary"
                    size="xs"
                    loading={isSwitchUserLoading}
                    disabled={isSwitchUserLoading}
                    title="Revenir à mon compte"
                    aria-label="Revenir à mon compte"
                    onClick={() => resetToBaseUser()}
                  ></CustomButton>
                )}
              </div>
            )}
            <CustomButton
              leftIcon={<Icon iconName="grip" />}
              iconOnly={!isOpenLogout && !mobileOpen}
              variant="neutral"
              size="xs"
              onClick={() => setAppSwitcherModalOpen(true)}
            >
              Changer d'application
            </CustomButton>
            <CustomButton
              leftIcon={
                IS_PRODUCTION ? (
                  <Icon iconName="home" />
                ) : (
                  <Icon iconName="sign-out-alt" />
                )
              }
              iconOnly={!isOpenLogout && !mobileOpen}
              onClick={() => void handleLogout()}
              variant={IS_PRODUCTION ? "info" : "danger"}
              size="xs"
            >
              {IS_PRODUCTION ? "Retour au portail" : "Déconnexion"}
            </CustomButton>
          </div>
        </>
      )}

      {/* Modal changement d'utilisateur (déplacé depuis le Header) */}
      {isAdmin && (
        <SwitchUserModal
          isOpen={isSwitchUserModalOpen}
          onClose={() => setSwitchUserModalOpen(false)}
        />
      )}

      {/* Modal changement d'application : bascule vers une autre appli du
          portail sans avoir à y retourner (liste + redirection avec token
          dédié, cf. useAppSwitcher). */}
      <AppSwitcherModal
        isOpen={isAppSwitcherModalOpen}
        onClose={() => setAppSwitcherModalOpen(false)}
      />

      {/* Modal détail des nouveautés */}
      {isVersionModalOpen && version && (
        <VersionModal
          isOpen={isVersionModalOpen}
          version={version}
          onClose={closeVersionModal}
        />
      )}
    </aside>
  );
};

export default Nav;
