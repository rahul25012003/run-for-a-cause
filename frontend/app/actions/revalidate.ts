"use server";

import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Server action — invalidates all caches that depend on site_settings.
 * Called from /admin/content after a successful save so edits appear
 * on the public site immediately, without waiting for the 30s ISR window.
 */
export async function revalidateContentCache(): Promise<void> {
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
  revalidatePath("/events");
  revalidatePath("/causes");
  revalidatePath("/transparency");
  revalidatePath("/about");
}
