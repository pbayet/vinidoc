import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import extractRoutes from "./extractRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "dist");

if (!fs.existsSync(distDir)) {
  throw new Error(
    `Le dossier ${distDir} n'existe pas. Lance d'abord le build.`
  );
}

const routePaths = extractRoutes();
console.log("Routes détectées:", routePaths);

// Conserve uniquement les routes SANS segment dynamique (":")
const staticRoutes = routePaths.filter((r) => !r.includes("/:"));

const created = new Set();

for (const routePath of staticRoutes) {
  // normalise: "/login/" -> "login"
  const clean = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!clean) continue; // racine

  // crée le chemin dossier compatible Windows
  const folderPath = path.join(distDir, ...clean.split("/"));

  if (!created.has(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    fs.copyFileSync(
      path.join(distDir, "index.html"),
      path.join(folderPath, "index.html")
    );
    created.add(folderPath);
  }
}

// Fallback SPA pour les hébergements type GitHub Pages
const indexHtml = path.join(distDir, "index.html");
const notFoundHtml = path.join(distDir, "404.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  console.log("404.html créé pour fallback SPA.");
}

console.log(
  "Structure de dossiers créée (routes statiques). Les routes dynamiques sont gérées par le fallback."
);
