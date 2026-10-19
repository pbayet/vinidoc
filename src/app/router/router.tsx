import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../../pages/LoginPage";
import PrivateRoute from "../../features/auth/ui/PrivateRoute";
import HomePage from "../../pages/HomePage";
import OenologiePage from "../../pages/OenologiePage";
import ValidationPage from "../../pages/ValidationPage";
import ModelesPage from "../../pages/ModelesPage";
import ParametresPage from "../../pages/ParametresPage";
import NotFoundPage from "../../pages/NotFoundPage";

/*
 * Accès : droits VINIDOC renvoyés par l'API (GET /vinidoc/me, cf.
 * VinidocContext) — `requireRight` sur la route, même signal que les liens
 * affichés dans Nav.tsx, pour qu'un accès direct par URL ne contourne pas
 * la restriction. Les boutons d'action de chaque page suivent les mêmes
 * droits, et l'API les re-vérifie de toute façon.
 *   - fiches œnologiques : lecture pour tous, saisie si EDIT (œnologie)
 *   - À valider          : VALIDATE (marketing)
 *   - modèles            : TEMPLATES
 */
const RouterConfig: React.FC = () => {
  return (
    <Routes>
      {/* Accueil : génération des fiches techniques produits */}
      <Route path="/" element={<PrivateRoute component={HomePage} />} />

      {/* Fiches œnologiques : liste ; création (droit EDIT, vérifié par
          SheetsList) et détail s'ouvrent en modale au-dessus de la liste.
          Routes enfants sans élément : la liste reste montée. */}
      <Route
        path="/oenologie"
        element={<PrivateRoute component={OenologiePage} />}
      >
        <Route path="/oenologie/new" element={null} />
        <Route path="/oenologie/:shtid" element={null} />
      </Route>

      {/* Validation marketing */}
      <Route
        path="/validation"
        element={
          <PrivateRoute component={ValidationPage} requireRight="VALIDATE" />
        }
      >
        <Route path="/validation/:shtid" element={null} />
      </Route>

      {/* Modèles PowerPoint — ajout (/new) et modification (/:tplid)
          s'ouvrent en modale au-dessus de la liste (cf. ModelesPage) */}
      <Route
        path="/modeles"
        element={
          <PrivateRoute component={ModelesPage} requireRight="TEMPLATES" />
        }
      >
        {/* Routes enfants sans élément : la liste reste montée sous la modale */}
        <Route path="/modeles/new" element={null} />
        <Route path="/modeles/:tplid" element={null} />
      </Route>

      {/* Paramètres de l'utilisateur (thème) */}
      <Route
        path="/parametres"
        element={<PrivateRoute component={ParametresPage} />}
      />

      {/* Ancienne URL éventuelle */}
      <Route path="/fiches" element={<Navigate to="/oenologie" replace />} />

      {/* Page de connexion accessible à tous */}
      <Route path="login" element={<LoginPage />} />

      {/* Page 404 si la route n'existe pas */}
      <Route path="*" element={<PrivateRoute component={NotFoundPage} />} />
    </Routes>
  );
};

export default RouterConfig;
