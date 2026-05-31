import ScreenShell from '../../components/ui/ScreenShell'

export default function AuthShell({ children, title, back }) {
  return (
    <ScreenShell>
      <div className="mb-8 text-center">
        <div className="label-mono mb-2 text-lilac">Meditation</div>
      </div>
      {back && <div className="mb-4">{back}</div>}
      <h2 className="mb-6 text-center font-serif text-[28px] text-fg-0">{title}</h2>
      {children}
    </ScreenShell>
  )
}

export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-mono">{label}</span>
      {children}
    </label>
  )
}
