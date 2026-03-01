'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiLogin } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Normalise to E.164: strip spaces/dashes then prepend + if missing
    const normalizedPhone = phone.trim().replace(/[\s\-]/g, '');
    const e164Phone = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;

    try {
      const result = await apiLogin(e164Phone, password);
      login(result.accessToken, result.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Phone Number"
        type="tel"
        placeholder="919973297390"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        autoComplete="tel"
      />
      <p className="text-xs text-slate-400 -mt-3">Country code + number, no spaces (e.g. 919876543210 or +919876543210)</p>
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
