export function SocialProof() {
  return (
    <section className="py-32 bg-black text-white px-6 relative">
      <div className="max-w-5xl mx-auto text-center relative">
        <span className="font-editorial text-9xl text-slate-800 leading-none absolute -ml-12 -mt-10 block">
          &ldquo;
        </span>
        <blockquote className="relative z-10 font-editorial text-3xl md:text-5xl leading-tight font-light">
          We started as skeptics. The data didn&rsquo;t lie. 42% of our inbound
          calls are from new patients. TrueLark ensured they&rsquo;re booked,
          not lost to a missed call.
        </blockquote>
        <div className="mt-12 flex flex-col items-center">
          <p className="text-sm uppercase tracking-widest">Myles McCallister</p>
          <p className="text-xs text-slate-500 mt-2">
            Chief Operations Officer
          </p>
        </div>
      </div>
    </section>
  );
}
