import React from "react";
import SheetsList from "../features/vinidoc/sheets/SheetsList";

/**
 * Marketing — fiches soumises par l'œnologie, en attente de validation.
 * Un clic ouvre la fiche en modale (`/validation/:shtid`), avec les boutons
 * Valider / Refuser.
 */
const ValidationPage: React.FC = () => (
  <SheetsList
    title="Fiches à valider"
    basePath="/validation"
    fixedStatus="SUBMITTED"
    emptyLabel="Aucune fiche en attente de validation."
  />
);

export default ValidationPage;
