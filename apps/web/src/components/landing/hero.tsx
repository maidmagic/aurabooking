import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-[#FAFAFA] px-6">
      <div className="z-10 text-center max-w-4xl mx-auto mt-20">
        <h1 className="font-editorial text-6xl md:text-8xl tracking-tight text-black leading-tight">
          Text. Book.{" "}
          <br />
          <span className="text-slate-400 italic">Done.</span>
        </h1>
        <p className="mt-8 text-lg text-slate-500 max-w-2xl mx-auto font-light leading-relaxed">
          Clients text a number, get an instant AI response, and book directly into your calendar.
          60% of booking attempts happen after hours — never miss one again.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/widget-demo"
            className="px-8 py-4 bg-black text-white text-sm tracking-widest uppercase hover:bg-slate-800 transition-colors"
          >
            See It In Action
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 text-sm tracking-widest uppercase text-slate-900 border-b border-transparent hover:border-black transition-all"
          >
            App Login
          </Link>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[120px] opacity-60 pointer-events-none" />
    </section>
  );
}
