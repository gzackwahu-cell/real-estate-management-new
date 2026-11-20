"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitEnquiryAction, submitViewingAction } from "@/lib/listings/actions";
import { PREFERRED_TIMES, labelFor, LISTING_TYPES } from "@/lib/listings/constants";
import type { PublishedListingOption } from "@/lib/listings/queries";
import {
  initialPublicFormState,
  type PublicFormState,
} from "@/lib/listings/validation";
import { FormField } from "@/components/portfolio/form-field";

type ContactRequestFormProps = {
  mode: "enquiry" | "viewing";
  listings: PublishedListingOption[];
  defaultListingSlug?: string;
};

export function ContactRequestForm({
  mode,
  listings,
  defaultListingSlug,
}: ContactRequestFormProps) {
  const action = mode === "enquiry" ? submitEnquiryAction : submitViewingAction;
  const [state, formAction, pending] = useActionState<PublicFormState, FormData>(
    action,
    initialPublicFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      {state.status === "success" ? (
        <p
          role="status"
          className="rounded-lg border border-danwell-teal/30 bg-danwell-teal/10 px-4 py-3 text-sm text-danwell-teal"
        >
          {state.successMessage}
        </p>
      ) : null}
      {state.status === "error" && state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <FormField name="listingSlug" label="Property" error={errors.listingSlug}>
        <Select
          id="listingSlug"
          name="listingSlug"
          defaultValue={defaultListingSlug ?? listings[0]?.slug ?? ""}
          aria-invalid={Boolean(errors.listingSlug)}
          required
        >
          <option value="">Select a property</option>
          {listings.map((listing) => (
            <option key={listing.slug} value={listing.slug}>
              {listing.title} — {listing.town}, {listing.county} (
              {labelFor(LISTING_TYPES, listing.listing_type)})
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField name="fullName" label="Full name" error={errors.fullName}>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            aria-invalid={Boolean(errors.fullName)}
          />
        </FormField>

        <FormField name="phone" label="Phone number" error={errors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+2547..."
            aria-invalid={Boolean(errors.phone)}
          />
        </FormField>

        <FormField name="email" label="Email address" error={errors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
          />
        </FormField>

        <FormField
          name="preferredDate"
          label={mode === "viewing" ? "Preferred viewing date" : "Preferred contact date"}
          error={errors.preferredDate}
        >
          <Input
            id="preferredDate"
            name="preferredDate"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            aria-invalid={Boolean(errors.preferredDate)}
          />
        </FormField>

        {mode === "viewing" ? (
          <FormField name="preferredTime" label="Preferred time" error={errors.preferredTime}>
            <Select id="preferredTime" name="preferredTime" defaultValue="">
              <option value="">No preference</option>
              {PREFERRED_TIMES.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </Select>
          </FormField>
        ) : null}
      </div>

      <FormField name="message" label="Message" error={errors.message}>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder={
            mode === "viewing"
              ? "Tell us what you would like to see or any questions you have."
              : "Tell us what you would like to know about this property."
          }
          aria-invalid={Boolean(errors.message)}
        />
      </FormField>

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-danwell-navy px-6 py-3 text-base font-semibold text-white hover:bg-danwell-teal sm:w-auto"
      >
        {pending
          ? "Sending..."
          : mode === "viewing"
            ? "Request viewing"
            : "Send enquiry"}
      </Button>
    </form>
  );
}
