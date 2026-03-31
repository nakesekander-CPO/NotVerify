import { Eye, SlidersHorizontal, CheckSquare, CheckCircle2 } from 'lucide-react'

const sections = [
  { key: 'understand', label: 'Understand', sublabel: 'What the AI found', icon: Eye },
  { key: 'decide', label: 'Decide', sublabel: 'Configure deployment', icon: SlidersHorizontal },
  { key: 'confirm', label: 'Confirm', sublabel: 'Review & execute', icon: CheckSquare },
]

export default function DecisionStepper({ activeSection, completedSections, onSectionClick }) {
  return (
    <div className="sticky top-32 flex flex-col gap-0">
      {sections.map((section, i) => {
        const isActive = activeSection === section.key
        const isCompleted = completedSections.has(section.key)
        const Icon = section.icon

        return (
          <div key={section.key}>
            {/* Node row */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => onSectionClick(section.key)}
            >
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-50 border-2 border-emerald-500/30'
                    : isActive
                    ? 'bg-straker-50 border-2 border-straker-400/40'
                    : 'bg-black/[0.03] border border-black/[0.12]'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-straker-600' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="ml-3">
                <p
                  className={`text-[13px] ${
                    isCompleted
                      ? 'font-medium text-emerald-600/80'
                      : isActive
                      ? 'font-semibold text-gray-900'
                      : 'font-medium text-gray-400'
                  }`}
                >
                  {section.label}
                </p>
                <p
                  className={`text-[11px] ${
                    isCompleted
                      ? 'text-gray-400'
                      : isActive
                      ? 'text-straker-600/70'
                      : 'text-gray-300'
                  }`}
                >
                  {section.sublabel}
                </p>
              </div>
            </div>

            {/* Connecting line */}
            {i < sections.length - 1 && (
              <div
                className={`w-0.5 h-8 ml-[15px] my-1 ${
                  isCompleted ? 'bg-emerald-400/20' : 'bg-black/[0.03]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
