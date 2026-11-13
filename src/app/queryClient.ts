// Cache des requêtes de l'application (@uvcdr/data-query), fourni par
// <QueryClientProvider> dans main.tsx. Exporté pour les fonctions hors
// composant qui doivent invalider des données.
import { QueryClient } from "@uvcdr/data-query";

export const queryClient = new QueryClient();
