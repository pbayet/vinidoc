import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, NotFoundPage } from "@uvcdr/app-shell";
import { VinidocRoute } from "./VinidocRoute";
import HomePage from "../../pages/HomePage";
import OenologiePage from "../../pages/OenologiePage";
import ValidationPage from "../../pages/ValidationPage";
import ModelesPage from "../../pages/ModelesPage";
import ParametresPage from "../../pages/ParametresPage";
import StatistiquesPage from "../../pages/StatistiquesPage";

/*
 * Accès : droits VINIDOC renvoyés par l'API (GET /vinidoc/me, cf.
 * VinidocContext) — `requireRight` sur la route, même signal que les liens
 * affichés dans la Nav (app/navigation.ts), pour qu'un accès direct par URL ne contourne pas
 * la restriction. Les boutons d'action de chaque page suivent les mêmes
 * droits, et l'API les re-vérifie de toute façon.
 *   - fiches œnologiques : lecture pour tous, saisie si EDIT (œnologie)
 *   - À valider          : VALIDATE (marketing)
 *   - modèles            : TEMPLATES
 * ⚠️ TEMPORAIRE : en production, un utilisateur de statut USER n'accède
 * qu'aux balises de fusion de /modeles et à l'apparence de /parametres
 * (cf. useMergeFieldsOnly).
 */
const RouterConfig: React.FC = () => {
  return (
    <Routes>
      {/* Accueil : génération des fiches techniques produits */}
      <Route path="/" element={<VinidocRoute component={HomePage} />} />

      {/* Fiches œnologiques : liste ; création (droit EDIT, vérifié par
          SheetsList) et détail s'ouvrent en modale au-dessus de la liste.
          Routes enfants sans élément : la liste reste montée. */}
      <Route
        path="/oenologie"
        element={<VinidocRoute component={OenologiePage} />}
      >
        <Route path="/oenologie/new" element={null} />
        <Route path="/oenologie/:shtid" element={null} />
      </Route>

      {/* Validation marketing */}
      <Route
        path="/validation"
        element={
          <VinidocRoute component={ValidationPage} requireRight="VALIDATE" />
        }
      >
        <Route path="/validation/:shtid" element={null} />
      </Route>

      {/* Modèles PowerPoint — ajout (/new) et modification (/:tplid)
          s'ouvrent en modale au-dessus de la liste (cf. ModelesPage) */}
      <Route
        path="/modeles"
        element={
          <VinidocRoute
            component={ModelesPage}
            requireRight="TEMPLATES"
            allowMergeFieldsOnly
          />
        }
      >
        {/* Routes enfants sans élément : la liste reste montée sous la modale */}
        <Route path="/modeles/new" element={null} />
        <Route path="/modeles/:tplid" element={null} />
      </Route>

      {/* Statistiques (fiches œnologiques, générations) : tout utilisateur
          VINIDOC, hors accès restreint aux balises de fusion */}
      <Route
        path="/statistiques"
        element={<VinidocRoute component={StatistiquesPage} />}
      />

      {/* Paramètres : onglets Général (paramètres de l'application) et
          Affichage (thème), chacun sur sa route (cf. ParametresPage).
          Route enfant sans élément : la page reste montée. */}
      <Route
        path="/parametres"
        element={
          <VinidocRoute component={ParametresPage} allowMergeFieldsOnly />
        }
      >
        <Route path="/parametres/affichage" element={null} />
      </Route>

      {/* Ancienne URL éventuelle */}
      <Route path="/fiches" element={<Navigate to="/oenologie" replace />} />

      {/* Page de connexion accessible à tous */}
      <Route path="login" element={<LoginPage />} />

      {/* Page 404 si la route n'existe pas */}
      <Route path="*" element={<VinidocRoute component={NotFoundPage} />} />
    </Routes>
  );
};

export default RouterConfig;
