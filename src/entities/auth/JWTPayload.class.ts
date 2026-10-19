/**
 * JWTPayload — décode et expose le contenu du JWT stocké en cookie.
 *
 * Implémentation déplacée dans `@uvcdr/api-auth-system` (généralisée pour
 * toutes les applications UVCDR). Ce fichier ne fait que la ré-exporter afin
 * de garder un point d'import stable (`entities/auth`) pour le reste de
 * l'application.
 */
export { JWTPayload } from "@uvcdr/api-auth-system";
export type { DefaultUserData, JWTTokenPayload } from "@uvcdr/api-auth-system";
