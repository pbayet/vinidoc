// src/app/navigation.ts
//
// Sections de la navigation latérale (@uvcdr/app-shell), passées à
// <UnisAppProviders useNavigation={useAppNavigation}> dans App.tsx.

import type { NavProps, NavSection } from "@uvcdr/app-shell";
import { useVinidoc } from "../features/vinidoc/context/VinidocContext";
import { useMergeFieldsOnly } from "../features/auth/hooks/useMergeFieldsOnly";

/** Props de la Nav, communes à toutes les routes (cf. VinidocRoute). */
export const NAV_PROPS: NavProps = { titleIcon: "wine-glass" };

export function useAppNavigation(): NavSection[] {
  // Visibilité des entrées : droits VINIDOC renvoyés par l'API
  // (GET /vinidoc/me — œnologie, marketing, modèles). Même signal que
  // `requireRight` sur les <Route> correspondantes de router.tsx : un
  // utilisateur sans ce droit ne voit ni les liens, ni les pages si
  // atteintes directement par URL.
  const { rights } = useVinidoc();
  // ⚠️ TEMPORAIRE — accès restreint : liens « Modèles PowerPoint » et
  // « Paramètres » seuls
  const mergeFieldsOnly = useMergeFieldsOnly();

  return [
    {
      items: [
        {
          label: "Fiches techniques",
          icon: "file-powerpoint",
          path: "/",
          show: !mergeFieldsOnly,
        },
        {
          label: "Fiches œnologiques",
          icon: "wine-bottle",
          path: "/oenologie",
          isActive: (p) => p === "/oenologie" || p.startsWith("/oenologie/"),
          show: !mergeFieldsOnly,
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "Modèles PowerPoint",
          icon: "object-group",
          path: "/modeles",
          isActive: (p) => p === "/modeles" || p.startsWith("/modeles/"),
          show: rights.TEMPLATES || mergeFieldsOnly,
        },
        {
          label: "Statistiques",
          icon: "chart-pie",
          path: "/statistiques",
          isActive: (p) => p === "/statistiques",
          // Même règle que la <Route path="/statistiques"> de router.tsx.
          show: !mergeFieldsOnly,
        },
      ],
    },
    {
      items: [
        {
          label: "Paramètres",
          icon: "gear",
          path: "/parametres",
        },
      ],
    },
  ];
}
