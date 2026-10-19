import React, { useEffect } from "react";
import { Modal } from "@uvcdr/modal";
import { Icon } from "@uvcdr/custom-form-system";
import { useAppSwitcher } from "../hooks/useAppSwitcher";
import "../styles/AppSwitcherModal.scss";

interface AppSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal "Changer d'application", ouvert depuis le bouton du même nom dans le
 * pied de la Nav (sous "Changer d'utilisateur"). Reprend la liste des
 * applications du portail (`usersmanager/home/applications`) sans avoir à y
 * retourner : un clic sur une appli récupère un token dédié (`auth/app`) et
 * redirige directement vers celle-ci.
 */
const AppSwitcherModal: React.FC<AppSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    applications,
    isLoadingApps,
    isSwitching,
    loadApplications,
    switchApp,
  } = useAppSwitcher();

  // Chargé à l'ouverture de la modale, pas au montage de la Nav — même
  // principe que SwitchUserModal.
  useEffect(() => {
    if (isOpen) loadApplications();
  }, [isOpen, loadApplications]);

  return (
    <Modal
      isOpen={isOpen}
      title="Changer d'application"
      onClose={onClose}
      size="sm"
      lockBodyScroll={false}
    >
      <div className="app-switcher">
        {isLoadingApps ? (
          [...Array(3)].map((_, index) => (
            <div key={index} className="app-switcher__item app-switcher__item--loading">
              <span className="app-switcher__item-icon-skeleton" />
              <span className="app-switcher__item-label-skeleton" />
            </div>
          ))
        ) : applications.length > 0 ? (
          applications.map((app) => (
            <button
              key={app.APPID}
              type="button"
              className="app-switcher__item"
              disabled={isSwitching}
              onClick={() => switchApp(app)}
            >
              <span className="app-switcher__item-icon">
                {app.LOGLNK ? (
                  <img src={app.LOGLNK} alt="" />
                ) : (
                  <Icon iconName="layer-group" />
                )}
              </span>
              <span className="app-switcher__item-body">
                <span className="app-switcher__item-name">{app.APPNAM}</span>
                {app.APPDES && (
                  <span className="app-switcher__item-desc">{app.APPDES}</span>
                )}
              </span>
              <Icon
                iconName="arrow-right"
                className="app-switcher__item-arrow"
              />
            </button>
          ))
        ) : (
          <div className="app-switcher__empty">
            <Icon iconName="grid-2" />
            <p>Aucune autre application disponible.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AppSwitcherModal;
