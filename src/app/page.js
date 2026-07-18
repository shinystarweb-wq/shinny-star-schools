export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <header className="bg-brand-blue-strong text-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">SHINNY STAR SCHOOLS</h1>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex gap-6 text-sm font-medium">
              <a href="#about" className="hover:opacity-80">About</a>
              <a href="#modules" className="hover:opacity-80">Features</a>
              <a href="#contact" className="hover:opacity-80">Contact</a>
            </nav>
            <a href="/login" className="bg-white text-brand-blue-strong text-sm font-semibold px-5 py-2 rounded-full shadow-sm border border-white/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">Portal Access</a>
          </div>
        </div>
      </header>

      <section className="bg-brand-blue">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 mb-4">Welcome to Shinny Star Schools</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">A modern digital platform for attendance, results, fees, and communication all in one place.</p>
          <a href="#modules" className="inline-block bg-brand-blue-strong text-white px-6 py-3 rounded-lg font-medium hover:opacity-90">Explore Features</a>
        </div>
      </section>

      <section id="modules" className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-center mb-10">What We Offer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-brand-blue rounded-xl p-6">
            <h4 className="font-semibold text-lg mb-2">Attendance</h4>
            <p className="text-slate-600 text-sm">Track daily attendance by class or subject with instant reports.</p>
          </div>
          <div className="bg-brand-blue rounded-xl p-6">
            <h4 className="font-semibold text-lg mb-2">Results</h4>
            <p className="text-slate-600 text-sm">Automated grading and printable report cards for every student.</p>
          </div>
          <div className="bg-brand-blue rounded-xl p-6">
            <h4 className="font-semibold text-lg mb-2">Fees</h4>
            <p className="text-slate-600 text-sm">Simple invoicing, payment tracking, and due-date reminders.</p>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-brand-blue-strong text-white">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm">© 2026 Shinny Star Schools. All rights reserved.</div>
      </footer>
    </main>
  );
}