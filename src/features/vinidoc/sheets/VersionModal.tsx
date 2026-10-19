import React, { useEffect, useState } from "react";
import { Modal, ModalBody } from "@uvcdr/modal";
import { useVinidocApi } from "../api/useVinidocApi";
import { useVinidoc } from "../context/VinidocContext";
import LanguageTabs from "../ui/LanguageTabs";
import SheetPreview from "../ui/SheetPreview";
import { formatDateTime } from "../lib/format";
import type { SheetVersion } from "../../../entities/vinidoc/vinidoc.types";

interface VersionModalProps {
  SHTID: number;
  /** Version à afficher ; null = modale fermée */
  VERNUM: number | null;
  onClose: () => void;
}

/** Contenu figé d'une version validée (toutes langues). */
const VersionModal: React.FC<VersionModalProps> = ({
  SHTID,
  VERNUM,
  onClose,
}) => {
  const api = useVinidocApi();
  const { languages, colors, defaultLng } = useVinidoc();
  const [version, setVersion] = useState<SheetVersion | null>(null);
  const [lng, setLng] = useState(defaultLng);

  useEffect(() => {
    if (VERNUM == null) return;
    let cancelled = false;
    setVersion(null);
    setLng(defaultLng);
    api
      .getVersion(SHTID, VERNUM)
      .then((v) => !cancelled && setVersion(v))
      .catch(() => onClose());
    return () => {
      cancelled = true;
    };
  }, [api, SHTID, VERNUM, defaultLng, onClose]);

  const present = version ? Object.keys(version.SNAPSHOT.TRANSLATIONS) : [];

  return (
    <Modal
      isOpen={VERNUM != null}
      onClose={onClose}
      title={`Version validée n°${VERNUM ?? ""}`}
      size="lg"
      closeOnOverlayClick={false}
    >
      <ModalBody>
        <div className="vd-dark-text">
          {!version ? (
            <p className="vd-muted">Chargement…</p>
          ) : (
            <>
              <p className="vd-muted">
                Validée le {formatDateTime(version.VALDAT)} par {version.VALUSR}
                {version.SUBUSR ? ` — soumise par ${version.SUBUSR}` : ""}
              </p>
              {version.COMMENT && (
                <blockquote className="vd-timeline__comment">
                  {version.COMMENT}
                </blockquote>
              )}
              <LanguageTabs
                languages={languages.filter((l) => present.includes(l.LNGCOD))}
                active={lng}
                onChange={setLng}
                present={present}
              />
              <SheetPreview
                sheet={version.SNAPSHOT}
                translation={version.SNAPSHOT.TRANSLATIONS[lng]}
                lng={lng}
                colors={colors}
              />
            </>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default VersionModal;
