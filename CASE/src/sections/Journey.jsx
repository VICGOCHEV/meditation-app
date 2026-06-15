import { Chapter, Cap, Up } from '../components/story'
import PhoneMockup from '../components/PhoneMockup'
import Icon from '../lib/icons'
import { ScreenOnboarding, ScreenAuth, ScreenPlayer } from '../components/AppScreens'
import { AppFilm, TrackerCalendar, demoTrackerDays } from '../components/RealUI'
import PracticeWall from '../components/app/PracticeWall'

// Дашборд показываем настоящим компонентом-трекером из аппки.
function DashboardReal() {
  return (
    <div className="flex h-full flex-col px-3.5 pt-9 pb-4">
      <p className="mb-3 px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-fg-3">Прогресс</p>
      <div className="[&_.panel]:p-3.5 [&_h3]:text-[15px]">
        <TrackerCalendar trackerDays={demoTrackerDays(15)} streak={12} />
      </div>
    </div>
  )
}

const BLOCKS = [
  { n: '01', title: 'Онбординг', screen: <ScreenOnboarding />, text: '4 спокойных экрана: пролог, методология, голос и музыка.' },
  { n: '02', title: 'Email-аутентификация', screen: <ScreenAuth />, text: 'Безопасный вход и восстановление пароля. Прогресс — на сервере.' },
  { n: '03', title: 'Умный аудиоплеер', screen: <ScreenPlayer />, text: 'Запоминает таймкод остановки — вернуться без потери контекста.' },
  { n: '04', title: 'Персональный дашборд', screen: <DashboardReal />, text: 'Календарь-трекер, страйк, аудиопотоки и подписка.' },
  { n: '05', title: 'Переходы и прелоадер', screen: <AppFilm slot="night" rounded="0" className="h-full" />, text: 'Бесшовные переходы и кастомный прелоадер.' },
]

export default function Journey() {
  return (
    <Chapter id="journey" kicker="User Journey" title="Интерфейсные сценарии и User Journey">
      {/* Главный экран — реальные карточки практик приложения (со всеми бликами) */}
      <Up>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[20px] font-light text-fg-0">Главный экран · стена практик</h3>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-3">реальный компонент Card</span>
        </div>
        <PracticeWall />
      </Up>

      {/* Остальные экраны — лента */}
      <Up>
        <p className="mb-2 mt-20 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-fg-3">
          листайте ленту экранов <Icon name="arrow" size={14} className="text-lilac" />
        </p>
      </Up>

      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-7 overflow-x-auto px-5 pb-8 pt-6">
        {BLOCKS.map((b, i) => (
          <div key={b.n} className="w-[260px] shrink-0 snap-center sm:w-[290px]">
            <Up delay={(i % 3) * 0.06}>
              <div className="mb-7 flex justify-center" style={{ perspective: 1400 }}>
                <div style={{ transform: 'rotateY(-12deg) rotateX(4deg)', transformStyle: 'preserve-3d', transition: 'transform .4s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotateY(-12deg) rotateX(4deg)')}>
                  <PhoneMockup width={250} withSphere={false} float={false}>{b.screen}</PhoneMockup>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="ghost-num text-[28px]">{b.n}</span>
                <h3 className="text-[17px] font-light text-fg-0">{b.title}</h3>
              </div>
              <div className="mt-3">
                <Cap size="sm">{b.text}</Cap>
              </div>
            </Up>
          </div>
        ))}
      </div>
    </Chapter>
  )
}
