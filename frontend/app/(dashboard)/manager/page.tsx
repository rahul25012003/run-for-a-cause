import Link from "next/link";
import { PlusCircle } from "lucide-react";

export default function ManagerOverviewPage(): React.ReactNode {
  return (
    <div className="p-6 md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-display-md text-ink-900">
            Welcome back
          </h1>
          <p className="mt-2 text-ink-500">
            Manage your events, approve runners, and review distance entries.
          </p>
        </div>
        <Link href="/manager/events/new" className="btn-primary">
          <PlusCircle className="w-4 h-4" /> New event
        </Link>
      </div>

      <div className="mt-10 card p-8 text-center text-ink-500">
        <p>Pick an event from the sidebar to start, or create your first one.</p>
      </div>
    </div>
  );
}
