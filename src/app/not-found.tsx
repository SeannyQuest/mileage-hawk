import Link from "next/link";
import { MapPinOff, Home, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center space-y-6">
      <MapPinOff className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Page Not Found</h1>
        <p className="text-muted-foreground max-w-md">
          This page doesn&apos;t exist. It may have been moved or the URL might be incorrect.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link href="/routes">
          <Button variant="outline" className="gap-2">
            <Plane className="h-4 w-4" />
            Browse Routes
          </Button>
        </Link>
      </div>
    </div>
  );
}
