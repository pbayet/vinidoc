import React from "react";
import { Icon } from "@uvcdr/custom-form-system";
import type { SheetEvent } from "../../../entities/vinidoc/vinidoc.types";
import { EVENT_LABELS, formatDateTime } from "../lib/format";

const EVENT_ICONS: Record<SheetEvent["EVTTYP"], string> = {
  CREATED: "plus",
  UPDATED: "pen",
  TRANSLATION_SAVED: "language",
  TRANSLATION_DELETED: "eraser",
  SUBMITTED: "paper-plane",
  VALIDATED: "circle-check",
  VALIDATED_UPDATED: "code-branch",
  REJECTED: "circle-xmark",
  DELETED: "trash",
};

/** Journal des actions d'une fiche (plus récent en premier). */
const EventsTimeline: React.FC<{ events: SheetEvent[] }> = ({ events }) => {
  if (!events.length) return <p className="vd-muted">Aucun évènement.</p>;

  return (
    <ol className="vd-timeline">
      {events.map((e) => (
        <li key={e.EVTID} className={`vd-timeline__item vd-timeline__item--${e.EVTTYP.toLowerCase()}`}>
          <span className="vd-timeline__icon">
            <Icon iconName={EVENT_ICONS[e.EVTTYP]} />
          </span>
          <div className="vd-timeline__content">
            <div>
              <strong>{EVENT_LABELS[e.EVTTYP]}</strong>
              {e.LNGCOD && <span className="vd-chip">{e.LNGCOD.toUpperCase()}</span>}
              {e.VERNUM && <span className="vd-chip vd-chip--success">v{e.VERNUM}</span>}
            </div>
            <div className="vd-muted">
              {formatDateTime(e.EVTDAT)} — {e.EVTUSR}
            </div>
            {e.COMMENT && <blockquote className="vd-timeline__comment">{e.COMMENT}</blockquote>}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default EventsTimeline;
