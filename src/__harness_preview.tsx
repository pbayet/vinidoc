import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import "@uvcdr/custom-form-system/dist/index.css";
import { ModalProvider } from "@uvcdr/modal";
import "@uvcdr/modal/styles.css";
import { CustomButton, FileViewerModal, Icon, useFileViewer } from "@uvcdr/custom-form-system";
library.add(fas);

const URL_PDF = "http://localhost:3001/api/uploads/VINDOC/previews/tpl-6-1fbb77479f09.pdf";

const Harness = () => {
  const viewer = useFileViewer();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const open = async (id: number) => {
    setLoadingId(id);
    try {
      await new Promise((r) => setTimeout(r, 300));
      viewer.open([{ name: "Aperçu - Test.pdf", url: URL_PDF, type: "application/pdf" }], 0);
      (window as any).__opened = true;
    } catch (e) {
      (window as any).__err = String(e);
    } finally {
      setLoadingId(null);
    }
  };
  return (
    <div style={{ padding: 20 }}>
      <CustomButton size="2xs" variant="outline" leftIcon={<Icon iconName="eye" />} loading={loadingId === 6} onClick={() => void open(6)}>
        Aperçu
      </CustomButton>
      {viewer.viewerProps && <FileViewerModal {...viewer.viewerProps} />}
    </div>
  );
};
ReactDOM.createRoot(document.getElementById("root")!).render(<ModalProvider><Harness /></ModalProvider>);
