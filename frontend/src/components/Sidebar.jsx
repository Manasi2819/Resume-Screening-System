// Sidebar navigation component — matches the design from code1.html / code2.html
export default function Sidebar({ screen, onNavigate }) {
  const navItems = [
    { id: 'screen',    label: 'New Screening', icon: 'add_circle' },
    { id: 'results',   label: 'Results',        icon: 'group'       },
    { id: 'history',   label: 'History',        icon: 'history'     },
  ]

  return (
    <nav className="hidden md:flex flex-col h-screen w-sidebar bg-surface-container-lowest border-r border-outline-variant shrink-0 p-lg z-20">
      {/* Brand */}
      <div className="mb-xl">
        <div className="flex items-center gap-sm mb-xs">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-body-lg">analytics</span>
          </div>
          <h1 className="text-headline-md font-bold text-primary">ResumeScreen</h1>
        </div>
        <p className="text-body-sm text-on-surface-variant pl-[40px]">AI-Powered Screening</p>
      </div>

      {/* Nav links */}
      <ul className="flex flex-col gap-xs flex-grow">
        {navItems.map((item) => {
          const isActive = screen === item.id
          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-md px-md py-sm rounded-DEFAULT transition-colors duration-150 text-left ${
                  isActive
                    ? 'bg-surface-container-low text-primary font-semibold border-r-2 border-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-body-md">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="mt-auto pt-lg border-t border-outline-variant">
        <div className="flex items-center gap-sm">
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-fixed text-body-sm">person</span>
          </div>
          <div className="flex flex-col">
            <span className="text-body-sm font-semibold text-on-surface">Recruiter</span>
            <span className="text-mono-sm text-on-surface-variant">Admin</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
