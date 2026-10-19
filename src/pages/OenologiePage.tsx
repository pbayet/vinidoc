import React from "react";
import SheetsList from "../features/vinidoc/sheets/SheetsList";

/**
 * Fiches œnologiques — liste consultable par tous ; création et saisie
 * réservées à l'œnologie (droit EDIT renvoyé par l'API).
 * `/oenologie/new` et `/oenologie/:shtid` ouvrent la fiche en modale.
 */
const OenologiePage: React.FC = () => (
  <SheetsList
    title="Fiches œnologiques"
    basePath="/oenologie"
    emptyLabel="Aucune fiche ne correspond à ces critères."
  />
);

export default OenologiePage;
