import assert from "node:assert/strict";
import test from "node:test";

import { buildSitemapEntries, STATIC_SITEMAP_ROUTES } from "./sitemap-core";

const SITE_URL = "https://danwell.example";

test("includes all static public pages and no private routes by default", () => {
  const entries = buildSitemapEntries(SITE_URL, []);

  assert.equal(entries.length, STATIC_SITEMAP_ROUTES.length);
  assert.deepEqual(entries[0], {
    url: `${SITE_URL}/`,
    changeFrequency: "weekly",
    priority: 1,
  });
  assert.deepEqual(entries[1], {
    url: `${SITE_URL}/about`,
    changeFrequency: "monthly",
    priority: 0.7,
  });

  const urls = entries.map((entry) => entry.url);
  const paths = entries.map((entry) => new URL(entry.url).pathname);
  assert.ok(urls.includes(`${SITE_URL}/enquire`));
  assert.ok(urls.includes(`${SITE_URL}/viewings/request`));

  for (const route of [
    "/faq",
    "/privacy",
    "/terms",
    "/refund",
    "/tenant-information",
    "/owner-information",
    "/land-guidance",
    "/commercial-guidance",
  ]) {
    assert.ok(urls.includes(`${SITE_URL}${route}`));
  }

  // The public information pages are not the same as the private portals.
  for (const prefix of ["/dashboard", "/owner", "/tenant"]) {
    assert.ok(
      !paths.some((path) => path === prefix || path.startsWith(`${prefix}/`)),
    );
  }
  assert.ok(paths.includes("/owner-information"));
  assert.ok(paths.includes("/tenant-information"));
});

test("adds eligible listing URLs with normalized last-modified dates", () => {
  const entries = buildSitemapEntries(`${SITE_URL}/`, [
    {
      slug: "modern-family-home",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-02-03T04:05:06Z",
    },
    {
      slug: "garden-apartment",
      created_at: "2026-01-02T00:00:00Z",
      updated_at: null,
    },
    {
      slug: "coastal-house",
    },
  ]);

  assert.deepEqual(entries.slice(STATIC_SITEMAP_ROUTES.length), [
    {
      url: `${SITE_URL}/properties/modern-family-home`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: "2026-02-03T04:05:06.000Z",
    },
    {
      url: `${SITE_URL}/properties/garden-apartment`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: "2026-01-02T00:00:00.000Z",
    },
    {
      url: `${SITE_URL}/properties/coastal-house`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]);
});

test("skips invalid or duplicate slugs and never copies private row fields", () => {
  const entries = buildSitemapEntries(SITE_URL, [
    { slug: "valid-slug" },
    { slug: "valid-slug" },
    { slug: "Invalid-Slug" },
    { slug: "has space" },
    { slug: "-leading-hyphen" },
    { slug: "trailing-hyphen-" },
    {
      slug: "another-valid-slug",
      property_id: "private-property-id",
      physical_address: "private address",
      full_name: "private person",
    } as never,
  ]);

  assert.deepEqual(entries.slice(STATIC_SITEMAP_ROUTES.length), [
    {
      url: `${SITE_URL}/properties/valid-slug`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/properties/another-valid-slug`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]);

  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry).sort(), [
      "changeFrequency",
      "lastModified",
      "priority",
      "url",
    ].filter((key) => key in entry).sort());
    assert.ok(!JSON.stringify(entry).includes("private"));
  }
});
