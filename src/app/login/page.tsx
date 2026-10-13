import { signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { message } = await searchParams;

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            LinkedIn Content Workspace
            <span className="brand__badge">Phase 1</span>
          </span>
        </div>
      </header>

      <main className="app-main auth-main">
        <section className="card auth-card" aria-labelledby="auth-heading">
          <h1 className="card__title" id="auth-heading">
            Sign in or create an account
          </h1>
          <p className="card__hint">
            Enter your email and password to sign in. No account yet? Use the
            Create account section below.
          </p>

          {message ? (
            <p className="auth-message" role="status">
              {message}
            </p>
          ) : null}

          <form className="auth-form">
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <input
                className="field__input"
                type="password"
                name="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>

            <div className="auth-actions">
              <button
                type="submit"
                className="button button--enabled"
                formAction={signIn}
              >
                Sign in
              </button>
            </div>
          </form>

          <div className="auth-divider" role="separator">
            <span>New here?</span>
          </div>

          <form className="auth-form">
            {/* Reuse the same fields for sign-up via a second form so the
                browser submits the email/password entered above is not shared;
                users re-enter here. Kept simple for Phase 1 testing. */}
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="field__input"
                type="email"
                name="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Password (min 8 characters)</span>
              <input
                className="field__input"
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <div className="auth-actions">
              <button
                type="submit"
                className="button button--enabled"
                formAction={signUp}
              >
                Create account
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
