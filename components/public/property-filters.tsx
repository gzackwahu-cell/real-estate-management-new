"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  PROPERTY_CATEGORIES,
  type ListingType,
} from "@/lib/listings/constants";
import type { ListingFilters } from "@/lib/listings/validation";

type LocationOption = {
  id: string;
  name: string;
  areas: { id: string; name: string; isActive: boolean }[];
};

export function PropertyFilters({
  category,
  filters,
  locationOptions,
}: {
  category: ListingType;
  filters: ListingFilters;
  locationOptions: LocationOption[];
}) {
  const [county, setCounty] = useState(filters.county ?? "");

  const areas = useMemo(() => {
    if (!county) return [];
    const match = locationOptions.find((option) => option.name === county);
    return (match?.areas ?? []).filter((area) => area.isActive);
  }, [county, locationOptions]);

  return (
    <form
      action={`/properties/${category}`}
      method="get"
      className="grid gap-4 rounded-2xl border border-danwell-navy/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
    >
      <div>
        <Label htmlFor="county">County</Label>
        <Select
          id="county"
          name="county"
          value={county}
          onChange={(event) => setCounty(event.target.value)}
          className="mt-1.5"
        >
          <option value="">All counties</option>
          {locationOptions.map((option) => (
            <option key={option.id} value={option.name}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="area">Area / town</Label>
        <Select
          id="area"
          name="area"
          defaultValue={filters.area ?? ""}
          disabled={!county}
          className="mt-1.5"
        >
          <option value="">
            {county ? "All areas in county" : "Select county first"}
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.name}>
              {area.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="sm:col-span-2 lg:col-span-2">
        <Label htmlFor="location">Keyword or estate</Label>
        <Input
          id="location"
          name="location"
          defaultValue={filters.location ?? ""}
          placeholder="Estate, title or keyword"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="propertyType">Property type</Label>
        <Select
          id="propertyType"
          name="propertyType"
          defaultValue={filters.propertyType ?? ""}
          className="mt-1.5"
        >
          <option value="">All types</option>
          {PROPERTY_CATEGORIES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="bedrooms">Bedrooms</Label>
        <Select
          id="bedrooms"
          name="bedrooms"
          defaultValue={filters.bedrooms === null ? "" : String(filters.bedrooms)}
          className="mt-1.5"
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((count) => (
            <option key={count} value={count}>
              {count}+
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="minPrice">Min price</Label>
        <Input
          id="minPrice"
          name="minPrice"
          type="number"
          min="0"
          inputMode="numeric"
          defaultValue={filters.minPrice ?? ""}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="maxPrice">Max price</Label>
        <Input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min="0"
          inputMode="numeric"
          defaultValue={filters.maxPrice ?? ""}
          className="mt-1.5"
        />
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" className="bg-danwell-teal text-white hover:bg-danwell-navy">
          Search properties
        </Button>
        <Button asChild variant="outline" type="button">
          <Link href={`/properties/${category}`}>Clear filters</Link>
        </Button>
      </div>
    </form>
  );
}
