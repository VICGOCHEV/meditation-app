// Минималистичные инлайновые SVG-иконки в единой толщине линий (1.4),
// без сторонних библиотек — ровно тот принцип, что и в самом приложении.
// viewBox 0 0 24 24, stroke = currentColor.

const P = {
  // — Hero-плашки —
  layers: <><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12l9 4.5L21 12" /><path d="M3 16.5 12 21l9-4.5" /></>,
  devices: <><rect x="2.5" y="5" width="13" height="9" rx="1.6" /><path d="M2.5 17h13" /><rect x="17" y="9" width="4.5" height="10" rx="1.2" /></>,
  key: <><circle cx="8" cy="9" r="3.5" /><path d="M10.5 11.5 19 20" /><path d="M16 17l2-2M18.5 14.5 20.5 16.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" /></>,

  // — concepts / design —
  scale: <><path d="M5 20h14" /><path d="M9 16h6" /><path d="M7 12h10" /><path d="M5 8h14" /><circle cx="12" cy="4" r="1.4" /></>,
  sphere: <><circle cx="12" cy="12" r="8" /><path d="M5 10c4 3 10 3 14 0M5 14c4-3 10-3 14 0" /></>,
  unlock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.7-1.5" /><circle cx="12" cy="15.5" r="1.3" /></>,
  platforms: <><rect x="3" y="4" width="11" height="8" rx="1.4" /><rect x="15.5" y="8" width="5.5" height="11" rx="1.2" /><path d="M5 16h6" /></>,
  moon: <path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5Z" />,
  droplet: <path d="M12 3c3 4 6 7.2 6 10.5A6 6 0 0 1 6 13.5C6 10.2 9 7 12 3Z" />,
  type: <><path d="M5 6h14M5 6v2M19 6v2" /><path d="M12 6v13M9 19h6" /></>,
  tokens: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
  pen: <><path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" /><path d="M14 7l3 3" /></>,

  // — atmosphere —
  smoke: <><path d="M5 16c-2 0-3-1.4-3-3s1.4-3 3-2.8C5.2 7 7.4 5 10 5c3 0 5 2.2 5.2 4.8C18 9.6 20 11 20 13.4S18.4 17 16 17H5Z" /><path d="M7 20h8" /></>,
  pulse: <path d="M3 12h4l2-5 3 10 2-7 2 2h5" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  play: <><circle cx="12" cy="12" r="8.5" /><path d="M10 9l5 3-5 3V9Z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,

  // — diagnostics / journey —
  reflect: <><path d="M4 12a8 8 0 1 1 2.5 5.8L4 20" /><path d="M4 20v-4h4" /></>,
  future: <><path d="M20 12a8 8 0 1 1-2.5-5.8L20 8" /><path d="M20 4v4h-4" /></>,
  worry: <><circle cx="12" cy="12" r="8.5" /><path d="M9 10h.01M15 10h.01M8.5 16c1-1.2 2.2-1.8 3.5-1.8s2.5.6 3.5 1.8" /></>,
  muscle: <><path d="M6 7c2-1 4-1 5 1l2 4c1 2 3 2 5 1" /><path d="M5 17c2 1 4 1 5-1" /><circle cx="6" cy="7" r="1.2" /></>,
  formula: <><path d="M6 4h8l-5 8 5 8H6" /><path d="M15 9l4 6M19 9l-4 6" /></>,
  chart: <><path d="M4 4v16h16" /><path d="M8 15l3-4 3 2 4-6" /></>,
  enter: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8l4 4-4 4M14 12H3" /></>,
  checkin: <><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M8 12l3 3 5-6" /></>,

  // — progress —
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.3" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M9 3v4M15 3v4" /><circle cx="9" cy="14" r="1" /><circle cx="13" cy="14" r="1" /><circle cx="9" cy="18" r="1" /></>,
  gift: <><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M4 13h16M12 9v11" /><path d="M12 9C9 9 8 4 12 6c4-2 3 3 0 3Z" /></>,

  // — backend / infra —
  server: <><rect x="3.5" y="4" width="17" height="6" rx="1.4" /><rect x="3.5" y="14" width="17" height="6" rx="1.4" /><path d="M7 7h.01M7 17h.01" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></>,
  trash: <><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></>,
  contract: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  database: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" /><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" /></>,

  // — payments —
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  tariff: <><path d="M3 9l3-4h12l3 4-9 11L3 9Z" /><path d="M3 9h18M9 5l-2 4 5 11M15 5l2 4-5 11" /></>,
  webhook: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><path d="M9 9l6 6M14 7h3v3M10 17H7v-3" /></>,

  // — comms —
  telegram: <><path d="M21 5 3 12l5 2 2 5 3-4 4 3 4-13Z" /><path d="M8 14l9-6-6 7" /></>,
  cloud: <><path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 18H7Z" /><path d="M10 14l2 2 3-4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  feedback: <><path d="M4 5h16v10H9l-4 4V5Z" /><path d="M8 9h8M8 12h5" /></>,

  // — landing / devops —
  spark: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6" /><path d="M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3" /></>,
  rocket: <><path d="M12 3c3 2 5 5 5 9l-2 2H9l-2-2c0-4 2-7 5-9Z" /><circle cx="12" cy="9" r="1.6" /><path d="M9 16l-2 4M15 16l2 4" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></>,
  repo: <><path d="M6 4h12a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1Z" /><path d="M9 8h6M9 11h6" /></>,
  doc: <><path d="M7 3h7l5 5v13H7V3Z" /><path d="M14 3v5h5M10 13h6M10 16h6" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12l4 4 10-11" />,
  ssl: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
}

export default function Icon({ name, size = 22, className = '', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {P[name] || P.spark}
    </svg>
  )
}
