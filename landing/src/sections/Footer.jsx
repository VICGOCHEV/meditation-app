export default function Footer() {
  return (
    <footer className="relative border-t border-line px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="mono text-xs uppercase tracking-[0.18em] text-fg-3">
          Meditation · 2026
        </p>
        <div className="flex items-center gap-6 text-xs text-fg-3">
          <a href="https://all-relaxme.ru" target="_blank" rel="noreferrer" className="transition-colors hover:text-lilac" data-hover>
            all-relaxme.ru
          </a>
          <span>·</span>
          <a href="#" className="transition-colors hover:text-lilac" data-hover>Оферта</a>
          <span>·</span>
          <a href="#" className="transition-colors hover:text-lilac" data-hover>Политика</a>
        </div>
      </div>
    </footer>
  )
}
