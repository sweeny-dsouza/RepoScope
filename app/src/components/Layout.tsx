import { Outlet, useLocation } from 'react-router'
import Navigation from './Navigation'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navigation />
      <main className={isLanding ? '' : 'pt-16'}>
        <Outlet />
      </main>
      {!isLanding && <Footer />}
    </div>
  )
}
