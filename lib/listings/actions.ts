"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkRateLimit } from "./rate-limit";
import { getPublishedListingBySlugForSubmission } from "./queries";
import { createPublicListingClient } from "./supabase";
import {
  enquiryFormValues,
  enquiryInputSchema,
  formStateFromZod,
  initialPublicFormState,
  viewingFormValues,
  viewingInputSchema,
  type PublicFormState,
} from "./validation";

const GENERIC_ERROR =
  "Your request could not be sent. Please try again or contact Danwell directly.";

function clientIdentifier(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip")?.trim() || "unknown";
}

async function rateLimit(kind: "enquiry" | "viewing") {
  const headerList = await headers();
  const identifier = clientIdentifier(headerList);
  return checkRateLimit(
    `${kind}:${identifier}`,
    kind === "enquiry" ? 5 : 3,
    10 * 60 * 1000,
  );
}

export async function submitEnquiryAction(
  _previousState: PublicFormState,
  formData: FormData,
): Promise<PublicFormState> {
  // Honeypot: a filled hidden field is silently accepted but never stored.
  if (formData.get("website")) {
    return initialPublicFormState;
  }

  const limit = await rateLimit("enquiry");
  if (!limit.allowed) {
    return {
      status: "error",
      error: `Too many enquiries from this connection. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const parsed = enquiryInputSchema.safeParse(enquiryFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const listing = await getPublishedListingBySlugForSubmission(parsed.data.listingSlug);
  if (!listing) {
    return {
      status: "error",
      error: "This property is no longer available for enquiries.",
      fieldErrors: { listingSlug: "Select another property." },
    };
  }

  try {
    const client = createPublicListingClient();
    const { error } = await client.from("sale_inquiries").insert({
      listing_id: listing.id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      preferred_date: parsed.data.preferredDate,
      message: parsed.data.message,
    });

    if (error) {
      return { status: "error", error: GENERIC_ERROR };
    }
  } catch {
    return { status: "error", error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/enquiries");
  return {
    status: "success",
    successMessage:
      "Thank you. Your enquiry has been received and Danwell will follow up shortly.",
  };
}

export async function submitViewingAction(
  _previousState: PublicFormState,
  formData: FormData,
): Promise<PublicFormState> {
  if (formData.get("website")) {
    return initialPublicFormState;
  }

  const limit = await rateLimit("viewing");
  if (!limit.allowed) {
    return {
      status: "error",
      error: `Too many viewing requests from this connection. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const parsed = viewingInputSchema.safeParse(viewingFormValues(formData));
  if (!parsed.success) {
    return formStateFromZod(parsed.error);
  }

  const listing = await getPublishedListingBySlugForSubmission(parsed.data.listingSlug);
  if (!listing) {
    return {
      status: "error",
      error: "This property is no longer available for viewings.",
      fieldErrors: { listingSlug: "Select another property." },
    };
  }

  try {
    const client = createPublicListingClient();
    const { error } = await client.from("viewing_appointments").insert({
      listing_id: listing.id,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      preferred_date: parsed.data.preferredDate,
      preferred_time: parsed.data.preferredTime || null,
      message: parsed.data.message,
    });

    if (error) {
      return { status: "error", error: GENERIC_ERROR };
    }
  } catch {
    return { status: "error", error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/viewings");
  return {
    status: "success",
    successMessage:
      "Thank you. Your viewing request has been received and Danwell will confirm shortly.",
  };
}
