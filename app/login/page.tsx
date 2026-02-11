// app/login/page.tsx - ✅ Login con Server Actions
import { login, signup } from './actions';

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-neutral-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-neutral-900">NDW Core</h1>
          <p className="text-sm text-neutral-600 mt-2">Accedi al tuo account</p>
        </div>

        <form className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              placeholder="nome@esempio.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              formAction={login}
              className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-medium"
            >
              Accedi
            </button>
            <button
              formAction={signup}
              className="w-full px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition font-medium"
            >
              Registrati
            </button>
          </div>
        </form>

        <p className="text-xs text-center text-neutral-500 mt-6">
          Nota Digital Works © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}