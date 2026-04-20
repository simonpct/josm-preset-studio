import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeLogin } from '@/lib/auth';

export function CallbackRoute() {
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    completeLogin(location.search)
      .then(({ returnTo }) => {
        navigate(returnTo ?? '/', { replace: true });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md space-y-3 text-center">
      {err ? (
        <>
          <h1 className="text-lg font-semibold">Sign-in failed</h1>
          <p className="text-sm text-red-600">{err}</p>
        </>
      ) : (
        <p className="text-sm text-slate-500">Completing sign-in…</p>
      )}
    </div>
  );
}
