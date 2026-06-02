// Минималистичные line-иконки, stroke=currentColor. Без внешних зависимостей.
const S = ({ children, size = 18, ...p }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {children}
  </svg>
)

export const IconPlay = (p) => <S {...p}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" /></S>
export const IconPause = (p) => <S {...p}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></S>
export const IconPlus = (p) => <S {...p}><path d="M12 5v14M5 12h14" /></S>
export const IconUpload = (p) => <S {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></S>
export const IconTrash = (p) => <S {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></S>
export const IconDots = (p) => <S {...p}><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /></S>
export const IconGrip = (p) => <S {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" /></S>
export const IconCheck = (p) => <S {...p}><path d="M5 12l5 5L20 7" /></S>
export const IconClose = (p) => <S {...p}><path d="M6 6l12 12M18 6L6 18" /></S>
export const IconBack = (p) => <S {...p}><path d="M15 6l-6 6 6 6" /></S>
export const IconSearch = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></S>
export const IconLayers = (p) => <S {...p}><path d="M12 3l9 5-9 5-9-5 9-5Z" /><path d="M3 13l9 5 9-5" /></S>
export const IconMic = (p) => <S {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></S>
export const IconMusic = (p) => <S {...p}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></S>
export const IconUsers = (p) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3.5 3.5 0 0 1 0 7M21 20a6 6 0 0 0-5-5.9" /></S>
export const IconCrown = (p) => <S {...p}><path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7Z" /></S>
export const IconLogout = (p) => <S {...p}><path d="M15 12H4M11 8l-4 4 4 4M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" /></S>
export const IconMessage = (p) => <S {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></S>
export const IconBell = (p) => <S {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></S>
