import Link from "next/link";

export default function ForgotPasswordPage(): React.ReactNode {
  return (
    <div className="card p-8">
      <h1 className="font-display text-2xl text-ink-900">Forgot password</h1>
      <p className="mt-2 text-sm text-ink-600">
        To reset your password, email us at{" "}
        <a href="mailto:hello@runforacause.in" className="text-primary-600 font-medium hover:underline">
          hello@runforacause.in
        </a>{" "}
        with your registered email address and we&apos;ll send you a reset link within a few minutes.
      </p>
      <Link href="/login" className="btn-secondary w-full mt-6">
        Back to sign in
      </Link>
    </div>
  );
}
