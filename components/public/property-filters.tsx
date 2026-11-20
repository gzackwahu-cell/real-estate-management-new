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

export function PropertyFilters({
  category,
  filters,
  counties,
}: {
  category: ListingType;
  filters: ListingFilters;
  counties: string[];
}) {
  return (
    <form
      action={`/properties/${category}`}
      method="get"
      className="grid gap-4 rounded-2xl border border-danwell-navy/10 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-6"
    >
      <div className="sm:col-span-2 lg:col-span-2">
        <Label htmlFor="location">Location or estate</Label>
        <Input
          id="location"
          name="location"
          defaultValue={filters.location ?? ""}
          placeholder="Town, estate or keyword"
          className="mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="county">County</Label>
        <Select id="county" name="county" defaultValue={filters.county ?? ""} className="mt-1.5">
          <option value="">All counties</option>
          {counties.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </Select>
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

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
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
