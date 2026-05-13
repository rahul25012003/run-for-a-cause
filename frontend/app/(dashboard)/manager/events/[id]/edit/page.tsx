"use client";

import { use } from "react";
import { EventEditForm } from "@/components/events/EventEditForm";

export default function ManagerEditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  return (
    <EventEditForm
      eventId={id}
      backHref="/manager/events"
      isSuperAdmin={false}
    />
  );
}
