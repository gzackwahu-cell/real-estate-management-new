import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { PUBLIC_STORAGE_BUCKET } from "@/lib/listings/constants";
import { createPublicListingClient } from "@/lib/listings/supabase";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

/** Streams only approved public listing/property images through a signed URL. */
export async function GET(_request: Request, { params }: RouteContext) {
  // Cache Components is enabled: opt this handler out of prerendering so each
  // request mints a fresh signed URL for the approved image.
  await connection();
  void _request;

  const { attachmentId } = await params;
  if (!z.uuid().safeParse(attachmentId).success) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const client = createPublicListingClient();
    const { data, error } = await client
      .from("attachments")
      .select("id, path, bucket")
      .eq("id", attachmentId)
      .eq("visibility", "public")
      .eq("bucket", PUBLIC_STORAGE_BUCKET)
      .maybeSingle();

    if (error || !data || data.bucket !== PUBLIC_STORAGE_BUCKET) {
      return new NextResponse("Not found", { status: 404 });
    }

    const signed = await client.storage
      .from(PUBLIC_STORAGE_BUCKET)
      .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);

    if (signed.error || !signed.data) {
      return new NextResponse("Not found", { status: 404 });
    }

    const response = NextResponse.redirect(signed.data.signedUrl, 302);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
