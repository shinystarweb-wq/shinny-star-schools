export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-800">
      <header className="bg-brand-blue-strong text-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">SHINY STAR SCHOOLS</h1>
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

      <section className="relative overflow-hidden bg-brand-blue">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-blue-strong/10"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand-blue-strong/10"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <span className="inline-block bg-white text-brand-blue-strong text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-sm">Now Enrolling — 2025/2026 Session</span>
          <h2 className="text-4xl md:text-6xl font-bold text-slate-800 mb-5 leading-tight">
            Welcome to <br className="hidden md:block" />Shiny Star Schools
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-10">
            A modern digital platform bringing attendance, results, fees, and communication together in one seamless place.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a href="#modules" className="inline-block bg-brand-blue-strong text-white px-7 py-3.5 rounded-full font-semibold hover:opacity-90 shadow-md hover:shadow-lg transition-all">Explore Features</a>
            <a href="/login" className="inline-block bg-white text-brand-blue-strong px-7 py-3.5 rounded-full font-semibold border border-brand-blue-strong/20 hover:shadow-md transition-all">Portal Access</a>
          </div>
        </div>
      </section>

      <section id="about" className="max-w-6xl mx-auto px-6 py-20 text-center">
        <p className="text-sm font-semibold text-brand-blue-strong uppercase tracking-wide mb-3">About Us</p>
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Educating with excellence, powered by technology</h3>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Shiny Star Schools brings together School, College, and Tutorial sections under one digital roof — giving admins, teachers, students, and parents real-time access to everything that matters, from attendance to results.
        </p>
      </section>

      <section id="modules" className="bg-brand-blue/40 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-brand-blue-strong uppercase tracking-wide mb-3">Features</p>
            <h3 className="text-3xl font-bold text-slate-800">What We Offer</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">📅</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">Attendance</h4>
              <p className="text-slate-600 text-sm">Track daily attendance by class with face recognition, QR scanning, and instant reports.</p>
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">📊</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">Results</h4>
              <p className="text-slate-600 text-sm">Automated grading, term comparisons, and printable report cards for every student.</p>
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">💳</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">Fees</h4>
              <p className="text-slate-600 text-sm">Transparent billing, payment tracking, and printable statements for every family.</p>
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">📝</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">CBT Exams</h4>
              <p className="text-slate-600 text-sm">Computer-based testing with AI-assisted question generation and instant scoring.</p>
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">📚</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">Lesson Notes & Assignments</h4>
              <p className="text-slate-600 text-sm">Teachers share notes and assignments directly with students, trackable in real time.</p>
            </div>
            <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center text-2xl mb-5">📢</div>
              <h4 className="font-bold text-lg mb-2 text-slate-800">Notices & Newsletter</h4>
              <p className="text-slate-600 text-sm">Keep everyone informed with targeted announcements and a printable school newsletter.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h3 className="text-3xl font-bold text-slate-800 mb-4">Ready to get started?</h3>
        <p className="text-slate-600 mb-8">Access your portal to manage attendance, results, and more.</p>
        <a href="/login" className="inline-block bg-brand-blue-strong text-white px-8 py-3.5 rounded-full font-semibold hover:opacity-90 shadow-md hover:shadow-lg transition-all">Go to Portal</a>
      </section>

      <footer id="contact" className="bg-brand-blue-strong text-white">
        <div className="max-w-6xl mx-auto px-6 py-10 text-center text-sm">
          <p className="font-semibold mb-1">SHINY STAR SCHOOLS</p>
          <p className="text-white/70">© 2026 Shiny Star Schools. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}