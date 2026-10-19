import React, { useCallback } from "react";
import UvcdrLogo from "../../../../assets/icon.png";
import "../styles/Header.scss";
import { IS_PRODUCTION } from "../../../../app/config";
import { clearCache } from "../../../../shared/lib/utils/cache.functions";
import { CustomButton, Icon } from "@uvcdr/custom-form-system";
import VersionModal from "../../Nav/ui/VersionModal";
import { useAuth } from "@uvcdr/api-auth-system";
import { useAppVersion } from "../../hooks/useAppVersion";

/* -------------------------------------------------------------------------- */
/*  Types                                                                       */
/* -------------------------------------------------------------------------- */

interface HeaderProps {
  loading: boolean;
  isLoginHeader?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Conservé pour compatibilité mais non affiché par `PrivateRoute` : la
 * bascule d'utilisateur, le badge de version et les infos utilisateur ont
 * été déplacés dans la `Nav` (cf. `features/layout/Nav/ui/Nav.tsx`).
 */
const Header: React.FC<HeaderProps> = ({ isLoginHeader }) => {
  const { jwtPayload, logout } = useAuth();
  const {
    version,
    versionLabel,
    isVersionModalOpen,
    openVersionModal,
    closeVersionModal,
  } = useAppVersion();

  /* ---------------------------------------------------------------------- */
  /*  Déconnexion                                                             */
  /* ---------------------------------------------------------------------- */

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  /* ---------------------------------------------------------------------- */
  /*  JSX                                                                     */
  /* ---------------------------------------------------------------------- */

  return (
    <header className="portal-header">
      {/* ── Head ── */}
      <div className="portal-header__head">
        <div className="portal-header__user">
          <span className="portal-header__user-name">
            {jwtPayload.$fullName}
          </span>
          <CustomButton
            onClick={() => {
              clearCache();
              window.location.reload();
            }}
            leftIcon={<Icon iconName="arrows-rotate"></Icon>}
            size="xs"
            variant="info"
          >
            Actualiser
          </CustomButton>
        </div>

        {version && (
          <CustomButton
            className={`portal-header__version-btn${version?.haveNotification ? " portal-header__version-btn--notif" : ""}`}
            onClick={openVersionModal}
            size="xs"
          >
            {versionLabel}
          </CustomButton>
        )}
      </div>

      {/* ── Foot ── */}
      <div className="portal-header__foot">
        <img src={UvcdrLogo} alt="Logo UVCDR" className="portal-header__logo" />

        {!isLoginHeader && (
          <CustomButton
            onClick={handleLogout}
            variant="ghost"
            iconOnly={IS_PRODUCTION}
            leftIcon={
              IS_PRODUCTION ? (
                <Icon iconName="home" />
              ) : (
                <Icon iconName="sign-out-alt" />
              )
            }
            size="xs"
          >
            Déconnexion
          </CustomButton>
        )}
      </div>

      {/* ── Modal version ── */}
      {isVersionModalOpen && version && (
        <VersionModal
          isOpen={isVersionModalOpen}
          version={version}
          onClose={closeVersionModal}
        />
      )}
    </header>
  );
};

export default Header;
