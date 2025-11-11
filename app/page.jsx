import Sidebar from "@/components/Sidebar";
import DashboardContent from "@/components/DashboardContent";
import { getPredictedCyclesAction } from "@/lib/actions/cycles";

export default async function Dashboard() {
  const result = await getPredictedCyclesAction();
  if (result.errors) {
    console.error("Error loading cycles:", result.errors);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <DashboardContent summary={result.predictions} />
    </div>
  );
}
