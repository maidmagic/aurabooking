export function DemoFooter() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-32 pb-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32">
        <div>
          <h2 className="font-editorial text-4xl mb-6">Schedule a Demo.</h2>
          <p className="text-slate-500 font-light mb-12 max-w-md">
            Add efficiency, full schedules, and reduced staff burnout. Let&rsquo;s
            talk about your volume.
          </p>
          <form className="space-y-6">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full border-b border-slate-200 py-4 focus:outline-none focus:border-black bg-transparent text-sm"
            />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full border-b border-slate-200 py-4 focus:outline-none focus:border-black bg-transparent text-sm"
            />
            <select className="w-full border-b border-slate-200 py-4 focus:outline-none focus:border-black bg-transparent text-slate-500 text-sm appearance-none">
              <option>Select Industry (Medical Spa, Dental, etc.)</option>
              <option>Medical Spa</option>
              <option>Dental</option>
            </select>
            <button
              type="submit"
              className="w-full bg-black text-white py-4 mt-8 text-sm tracking-widest uppercase hover:bg-slate-800 transition-colors"
            >
              Request Access
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-12 text-sm text-slate-500 font-light">
          <div>
            <h4 className="text-black font-medium mb-6">Platform</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="hover:text-black">
                  AI Receptionist
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Scheduling
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Texting &amp; Voice
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Analytics
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-black font-medium mb-6">Company</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="hover:text-black">
                  Customer Stories
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Partnerships
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-black">
                  Support: 888-579-5668
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
