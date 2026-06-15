import { Chapter, Split, StoryItem, Cap } from '../components/story'
import Icon from '../lib/icons'

function Terminal() {
  return (
    <div className="case-card overflow-hidden p-0">
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(180,160,255,0.1)', background: 'rgba(8,6,16,0.7)' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" /><span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-[11px] text-fg-3">deploy — all-relaxme.ru</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-relaxed text-fg-1 sm:text-[13px]">
<span className="text-lilac">$</span> git pull --ff-only
<span className="text-fg-3">  Updating · fast-forward</span>
<span className="text-lilac">$</span> npm install && npm run build
<span className="text-fg-3">  application · cms · landing · backend</span>
<span className="text-lilac">$</span> systemctl restart meditation-api
<span style={{ color: '#9ad6b4' }}>  ● active (running) — HTTPS · Caddy · Let's Encrypt</span>
      </pre>
    </div>
  )
}

function RepoTree() {
  return (
    <div className="case-card p-6 font-mono text-[13px] text-fg-1">
      <p className="mb-3 label-mono">Монорепозиторий</p>
      <p className="text-fg-0">APP/</p>
      <div className="mt-1.5 space-y-1.5">
        {[['application', 'Vite · React фронт'], ['backend', 'Fastify · Prisma · PostgreSQL'], ['cms', 'кастомная CMS SPA'], ['landing', 'WebGL scroll-scrub']].map(([d, t]) => (
          <p key={d} className="flex items-center gap-2 pl-4"><Icon name="repo" size={14} className="text-lilac" /><span className="text-fg-0">{d}/</span><span className="text-fg-3">— {t}</span></p>
        ))}
      </div>
    </div>
  )
}

export default function DevOps() {
  return (
    <Chapter id="devops" kicker="DevOps" title="DevOps и развертывание">
      <Split visual={<div className="space-y-5"><Terminal /><RepoTree /></div>}>
        <div className="space-y-12">
          <StoryItem icon="server" title="Единый сервер" index="01">
            <Cap size="sm">all-relaxme.ru: приложение, API, админка и лендинг под HTTPS с авто-SSL.</Cap>
          </StoryItem>
          <StoryItem icon="terminal" title="CI/CD одной командой" index="02" delay={0.06}>
            <Cap size="sm">Обновление кода, пересборка модулей и перезапуск инстансов — без ручной возни.</Cap>
          </StoryItem>
          <StoryItem icon="repo" title="Монорепозиторий" index="03" delay={0.1}>
            <Cap size="sm">App, Backend, CMS, Landing — сквозные команды и лёгкая передача проекта.</Cap>
          </StoryItem>
          <StoryItem icon="doc" title="Инженерная документация" index="04" delay={0.14}>
            <Cap size="sm">Более 30 хронологических логов фиксируют логику принятия решений.</Cap>
          </StoryItem>
        </div>
      </Split>
    </Chapter>
  )
}
