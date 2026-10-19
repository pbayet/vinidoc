import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour extraire les routes du fichier router.tsx
function extractRoutes() {
  try {
    // Lire le contenu du fichier router.tsx
    const routerFilePath = path.resolve(__dirname, "src/app/router/router.tsx");
    const routerContent = fs.readFileSync(routerFilePath, "utf-8");

    // Utiliser une expression régulière pour trouver les définitions de routes
    // Cette regex cherche les patterns comme <Route path="/some-path" ...>
    const routeRegex = /<Route\s+path=["']([^"']+)["']/g;
    const routes = [];
    let match;

    while ((match = routeRegex.exec(routerContent)) !== null) {
      const route = match[1];
      // On ne garde que les routes qui commencent par / et ne sont pas la route racine
      if (route !== "/" && route.startsWith("/")) {
        routes.push(route);
      }
    }

    return routes;
  } catch (error) {
    console.error("Erreur lors de l'extraction des routes:", error);
    return [];
  }
}

export default extractRoutes;
