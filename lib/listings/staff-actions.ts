"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { withPermission } from "@/lib/auth/guards";
import { slugify } from "./constants";
import type { PortfolioClient } from "@/lib/portfolio/queries";
import {
  enquiryUpdateSchema,
  followUpFormValues,
  listingFormValues,
  listingInputSchema,
  parseFeatures,
  viewingUpdateSchema,
  type StaffFormState,
} from "./validation";

const SAVE_ERROR = "The change could not be saved. Check the details and try again.";

function validId(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

function safeMutationError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Listing unit must belong to the selected property.")) {
    return message;
  }
  if (message.includes("listings_slug_key")) {
    return "That URL slug is already in use. Choose another.";
  }
  return SAVE_ERROR;
}

function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}

type ListingValues = z.infer<typeof listingInputSchema>;

function listingPayload(values: ListingValues, userId: string, isCreate: boolean) {
  const slug = slugify(values.slug || values.title);
  if (!slug) {
    throw new Error("Enter a listing title or URL slug.");
  }

  const managed = values.managedByAgency;
  const payload: Record<string, unknown> = {
    title: values.title,
    slug,
    listing_type: values.listingType,
    property_category: values.propertyCategory,
    status: values.status,
    is_featured: values.isFeatured,
    managed_by_agency: managed,
    property_id: managed ? values.propertyId : null,
    unit_id: managed ? values.unitId : null,
    description: values.description || null,
    county: values.county,
    town: values.town,
    estate: values.estate || null,
    physical_address: values.physicalAddress || null,
    bedrooms: values.bedrooms,
    bathrooms: values.bathrooms,
    price: values.price,
    price_period: values.pricePeriod,
    features: parseFeatures(values.features),
    updated_by: userId,
  };

  if (isCreate) {
    payload.created_by = userId;
  }

  return { slug, payload };
}

function revalidateListingPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/properties/rent");
  revalidatePath("/properties/sale");
  revalidatePath(`/properties/${slug}`);
  revalidatePath("/dashboard/listings");
}

export async function createListingAction(
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const parsed = listingInputSchema.safeParse(listingFormValues(formData));
  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let result: { ok: true; id: string; slug: string } | { ok: false; error: string } | undefined;

  await withPermission("listings", "create", async (context, supabase) => {
    try {
      const { slug, payload } = listingPayload(parsed.data, context.userId, true);
      const { data, error } = await supabase
        .from("listings")
        .insert(payload)
        .select("id, slug")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? SAVE_ERROR);
      }
      result = { ok: true, id: data.id, slug: data.slug ?? slug };
    } catch (error) {
      result = { ok: false, error: safeMutationError(error) };
    }
  });

  if (!result) {
    return { error: SAVE_ERROR };
  }
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateListingPaths(result.slug);
  redirect(`/dashboard/listings/${result.id}`);
}

export async function updateListingAction(
  listingId: string,
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  if (!validId(listingId)) {
    return { error: "Invalid listing record." };
  }

  const parsed = listingInputSchema.safeParse(listingFormValues(formData));
  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let result: { ok: true; slug: string } | { ok: false; error: string } | undefined;

  await withPermission("listings", "edit", async (context, supabase) => {
    try {
      const { slug, payload } = listingPayload(parsed.data, context.userId, false);
      const { error } = await supabase
        .from("listings")
        .update(payload)
        .eq("id", listingId);

      if (error) {
        throw new Error(error.message);
      }
      result = { ok: true, slug };
    } catch (error) {
      result = { ok: false, error: safeMutationError(error) };
    }
  });

  if (!result) {
    return { error: SAVE_ERROR };
  }
  if (!result.ok) {
    return { error: result.error };
  }

  revalidateListingPaths(result.slug);
  revalidatePath(`/dashboard/listings/${listingId}`);
  return { success: "Listing saved." };
}

export async function setListingPublishedAction(
  listingId: string,
  isPublished: boolean,
): Promise<void> {
  if (!validId(listingId)) {
    throw new Error("Invalid listing record.");
  }

  let slug = "";
  let failure: string | undefined;

  await withPermission("listings", "publish", async (context, supabase) => {
    try {
      const { data: listing, error: lookupError } = await supabase
        .from("listings")
        .select("slug")
        .eq("id", listingId)
        .maybeSingle();

      if (lookupError || !listing) {
        throw new Error(lookupError?.message ?? SAVE_ERROR);
      }
      slug = listing.slug;

      const update: Record<string, unknown> = {
        is_published: isPublished,
        updated_by: context.userId,
      };
      if (isPublished) {
        update.status = "active";
      }

      const { error } = await supabase
        .from("listings")
        .update(update)
        .eq("id", listingId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      failure = safeMutationError(error);
    }
  });

  if (failure) {
    throw new Error(failure);
  }

  if (slug) {
    revalidateListingPaths(slug);
  }
  revalidatePath("/dashboard/listings");
}

export async function updateEnquiryAction(
  enquiryId: string,
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  if (!validId(enquiryId)) {
    return { error: "Invalid enquiry record." };
  }

  const parsed = enquiryUpdateSchema.safeParse(
    followUpFormValues(formData, "status"),
  );
  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let failure: string | undefined;
  await withPermission("inquiries", "edit", async (context, supabase: PortfolioClient) => {
    try {
      const { error } = await supabase
        .from("sale_inquiries")
        .update({
          status: parsed.data.status,
          follow_up_notes: parsed.data.followUpNotes,
          updated_by: context.userId,
        })
        .eq("id", enquiryId);

      if (error) {
        throw new Error(error.message);
      }
    } catch {
      failure = SAVE_ERROR;
    }
  });

  if (failure) {
    return { error: failure };
  }

  revalidatePath("/dashboard/enquiries");
  revalidatePath(`/dashboard/enquiries/${enquiryId}`);
  return { success: "Enquiry updated." };
}

export async function updateViewingAction(
  viewingId: string,
  _previousState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  if (!validId(viewingId)) {
    return { error: "Invalid viewing request." };
  }

  const parsed = viewingUpdateSchema.safeParse(
    followUpFormValues(formData, "status"),
  );
  if (!parsed.success) {
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    };
  }

  let failure: string | undefined;
  await withPermission("viewings", "edit", async (context, supabase: PortfolioClient) => {
    try {
      const { error } = await supabase
        .from("viewing_appointments")
        .update({
          status: parsed.data.status,
          follow_up_notes: parsed.data.followUpNotes,
          updated_by: context.userId,
        })
        .eq("id", viewingId);

      if (error) {
        throw new Error(error.message);
      }
    } catch {
      failure = SAVE_ERROR;
    }
  });

  if (failure) {
    return { error: failure };
  }

  revalidatePath("/dashboard/viewings");
  revalidatePath(`/dashboard/viewings/${viewingId}`);
  return { success: "Viewing request updated." };
}
