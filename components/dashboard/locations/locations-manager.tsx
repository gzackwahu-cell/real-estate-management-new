"use client";

import { useMemo, useState, useTransition } from "react";
import { MapPin, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addCounty,
  createArea,
  deleteArea,
  toggleAreaActive,
  type LocationActionState,
} from "@/lib/locations/actions";
import { LocationActionButton } from "./location-action-button";

export type AdminLocationArea = {
  id: string;
  name: string;
  isActive: boolean;
};

export type AdminLocationCounty = {
  id: string;
  name: string;
  areas: AdminLocationArea[];
};

type LocationsManagerProps = {
  counties: AdminLocationCounty[];
  isSuperAdmin: boolean;
};

function ActionFeedback({ state }: { state: LocationActionState | null }) {
  if (!state) return null;
  if (state.ok) {
    return <p className="text-xs text-emerald-700">{state.message ?? "Saved."}</p>;
  }
  return <p className="text-xs text-destructive">{state.error ?? "Unable to save this change."}</p>;
}

export function LocationsManager({ counties, isSuperAdmin }: LocationsManagerProps) {
  const [query, setQuery] = useState("");
  const [selectedCountyId, setSelectedCountyId] = useState(counties[0]?.id ?? "");
  const [areaName, setAreaName] = useState("");
  const [countyName, setCountyName] = useState("");
  const [createPending, startCreateTransition] = useTransition();
  const [countyPending, startCountyTransition] = useTransition();
  const [createState, setCreateState] = useState<LocationActionState | null>(null);
  const [countyState, setCountyState] = useState<LocationActionState | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCounties = useMemo(() => {
    if (!normalizedQuery) return counties;
    return counties
      .map((county) => {
        const countyMatches = county.name.toLowerCase().includes(normalizedQuery);
        const matchingAreas = county.areas.filter((area) =>
          area.name.toLowerCase().includes(normalizedQuery),
        );
        if (countyMatches) return county;
        if (matchingAreas.length > 0) return { ...county, areas: matchingAreas };
        return null;
      })
      .filter((county): county is AdminLocationCounty => county !== null);
  }, [counties, normalizedQuery]);

  const totalAreas = counties.reduce((sum, county) => sum + county.areas.length, 0);
  const activeAreas = counties.reduce(
    (sum, county) => sum + county.areas.filter((area) => area.isActive).length,
    0,
  );

  function submitCreateArea(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateState(null);
    const countyId = selectedCountyId;
    const name = areaName.trim();
    if (!countyId) {
      setCreateState({ ok: false, error: "Select a county." });
      return;
    }
    if (!name) {
      setCreateState({ ok: false, error: "Enter an area name." });
      return;
    }
    startCreateTransition(async () => {
      const result = await createArea(countyId, name);
      setCreateState(result);
      if (result.ok) setAreaName("");
    });
  }

  function submitAddCounty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCountyState(null);
    const name = countyName.trim();
    if (!name) {
      setCountyState({ ok: false, error: "Enter a county name." });
      return;
    }
    startCountyTransition(async () => {
      const result = await addCounty(name);
      setCountyState(result);
      if (result.ok) setCountyName("");
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Counties</p>
            <p className="mt-1 text-2xl font-semibold text-danwell-navy">{counties.length}</p>
            <p className="text-xs text-muted-foreground">Built-in county reference data</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Areas</p>
            <p className="mt-1 text-2xl font-semibold text-danwell-navy">{totalAreas}</p>
            <p className="text-xs text-muted-foreground">Total localities across counties</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="pt-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Active areas</p>
            <p className="mt-1 text-2xl font-semibold text-danwell-navy">{activeAreas}</p>
            <p className="text-xs text-muted-foreground">Available for property and listing selection</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-danwell-navy">Add area</CardTitle>
          <CardDescription>
            Add a locality under an existing county. County names are fixed reference data and cannot be edited here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitCreateArea} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">County</span>
              <Select
                value={selectedCountyId}
                onChange={(e) => setSelectedCountyId(e.target.value)}
                disabled={counties.length === 0}
              >
                {counties.length === 0 ? <option value="">No counties available</option> : null}
                {counties.map((county) => (
                  <option key={county.id} value={county.id}>
                    {county.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Area name</span>
              <Input
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Kilimani"
                maxLength={120}
              />
            </label>
            <Button type="submit" disabled={createPending || counties.length === 0}>
              <Plus data-icon="inline-start" />
              {createPending ? "Adding..." : "Add area"}
            </Button>
          </form>
          <div className="mt-2">
            <ActionFeedback state={createState} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-danwell-navy">Counties and areas</CardTitle>
            <CardDescription>
              Manage active localities used by property and listing forms. Deactivate an area to hide it from new selections.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search county or area"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {counties.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center">
              <MapPin className="mx-auto size-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium text-danwell-navy">No counties found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The location taxonomy has not been seeded yet. Run the county/area migration before managing areas.
              </p>
            </div>
          ) : filteredCounties.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No counties or areas match “{query.trim()}”.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredCounties.map((county) => (
                <section key={county.id} className="overflow-hidden rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-danwell-navy">{county.name}</h3>
                      <Badge tone="neutral">{county.areas.length} area{county.areas.length === 1 ? "" : "s"}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">County name is fixed</p>
                  </div>
                  {county.areas.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No areas {normalizedQuery ? "match this search" : "added yet"} for this county.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Area</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {county.areas.map((area) => (
                            <tr key={area.id}>
                              <td className="px-3 py-2.5 font-medium text-danwell-navy">{area.name}</td>
                              <td className="px-3 py-2.5">
                                <Badge tone={area.isActive ? "positive" : "muted"}>
                                  {area.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <LocationActionButton
                                    label={area.isActive ? "Deactivate" : "Activate"}
                                    destructive={area.isActive}
                                    action={() => toggleAreaActive(area.id, !area.isActive)}
                                    confirm={
                                      area.isActive
                                        ? {
                                            title: "Deactivate area",
                                            description: `${area.name} will be hidden from new property and listing selections. Existing records keep their saved location text.`,
                                            confirmLabel: "Deactivate",
                                          }
                                        : undefined
                                    }
                                  />
                                  <LocationActionButton
                                    label="Delete"
                                    destructive
                                    action={() => deleteArea(area.id)}
                                    confirm={{
                                      title: "Delete area",
                                      description: `Delete ${area.name} from ${county.name}? If it is referenced by existing records, deletion will be blocked and you can deactivate it instead.`,
                                      confirmLabel: "Delete area",
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-danwell-navy">Add county</CardTitle>
            <CardDescription>
              Secondary Super Admin action. The 47 Kenya counties are expected to be present; only add a county for exceptional reference-data corrections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitAddCounty} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">County name</span>
                <Input
                  value={countyName}
                  onChange={(e) => setCountyName(e.target.value)}
                  placeholder="County name"
                  maxLength={120}
                />
              </label>
              <Button type="submit" variant="outline" disabled={countyPending}>
                {countyPending ? "Adding..." : "Add county"}
              </Button>
            </form>
            <div className="mt-2">
              <ActionFeedback state={countyState} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
