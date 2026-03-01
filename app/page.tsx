import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="card-3d max-w-lg w-full">
        <div className="card-3d-inner glass panel-depth rounded-3xl p-12 text-center">
          <h1 className="text-5xl font-bold mb-4 animate-slide-up">
            CWL Tracker
          </h1>
          <p className="text-lg text-neutral-600 mb-8 animate-fade-in">
            Clan War League Alignment & Tracking System
          </p>
          <Link
            href="/login"
            className="btn-primary bg-neutral-900 text-white px-8 py-3 rounded-xl inline-block
                       hover:bg-neutral-800 focus:ring-neutral-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
