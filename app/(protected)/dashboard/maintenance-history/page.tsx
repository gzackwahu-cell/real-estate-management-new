import { redirect } from "next/navigation";

export default function MaintenanceHistoryPage() {
  redirect("/dashboard/maintenance/requests");
}
