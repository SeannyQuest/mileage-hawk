import { AIRLINES } from "@/lib/constants";
import { AirlineGrid } from "@/components/airlines/AirlineGrid";

export const metadata = { title: "AMEX Transfer Partners" };

export default function AirlinesPage() {
  return <AirlineGrid airlines={AIRLINES} />;
}
