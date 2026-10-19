import React from "react";
import "../shared/styles/global.scss";
import { useNavigate } from "react-router-dom";
import Router from "./router/router";
import { forceCleanExpiredCache } from "../shared/lib/utils/cache.functions";
import { getLocalStorageSize } from "../shared/lib/utils/storage.functions";
import { DOMAIN, IS_PRODUCTION } from "./config";
import { AuthProvider } from "@uvcdr/api-auth-system";
import { WebSocketProvider } from "./context/WebSocketContext";
import { VinidocProvider } from "../features/vinidoc/context/VinidocContext";
import "../features/vinidoc/styles/vinidoc.scss";

const App: React.FC = () => {
  const navigate = useNavigate();

  forceCleanExpiredCache();
  if (!IS_PRODUCTION)
    console.log(`LocalStorage size : ${getLocalStorageSize()}`);

  return (
    <AuthProvider
      onLoginSuccess={() => navigate("/", { replace: true })}
      onLogout={() => {
        if (!IS_PRODUCTION) {
          navigate("/login");
        } else {
          window.location.href = `${DOMAIN}/home`;
        }
      }}
    >
      <WebSocketProvider>
        {/* Droits VINIDOC (œnologie / marketing / modèles), langues,
            couleurs et balises : chargés une fois pour toute l'application. */}
        <VinidocProvider>
          <div className="global-app-container">
            <Router />
          </div>
        </VinidocProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App;
