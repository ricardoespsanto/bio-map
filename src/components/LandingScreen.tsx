interface Props {
  onAddFirstVisit: () => void;
}

export function LandingScreen({ onAddFirstVisit }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-6">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-cyan-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Bio-Map</h1>
        <p className="text-slate-400 mb-2">Your URL <em>is</em> your health record.</p>
        <p className="text-slate-500 text-sm mb-10 leading-relaxed">
          Enter your lab values and we'll generate a deep link.<br />
          Bookmark it — that link holds your entire history.
        </p>

        <button
          onClick={onAddFirstVisit}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-3 px-4 rounded-lg transition-colors text-sm"
        >
          Enter my lab values
        </button>

        <p className="text-center text-xs text-slate-600 mt-8 leading-relaxed">
          Zero-knowledge. No server, no database, no account.<br />
          Your data never leaves this device.
        </p>
      </div>
    </div>
  );
}
