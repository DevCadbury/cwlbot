import LoginForm from '@/components/auth/LoginForm';
import { Swords } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
          <div className="text-center mb-7">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Swords className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to CWL Tracker</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
