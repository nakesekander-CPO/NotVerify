import TrustBadges from './TrustBadges'

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.12] bg-white mt-auto">
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 flex items-center justify-between gap-4">
        <TrustBadges />
        <p className="text-[11px] text-gray-500 shrink-0">
          &copy; {new Date().getFullYear()} arbitr. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <a href="#privacy" className="hover:text-straker-600 hover:underline underline-offset-2 cursor-pointer transition-colors">Privacy Policy</a>
          <a href="#terms" className="hover:text-straker-600 hover:underline underline-offset-2 cursor-pointer transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}
