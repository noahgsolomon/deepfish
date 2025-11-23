import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <Card className="bg-surface-secondary border-border-default mx-4 w-full max-w-md">
        <CardContent className="py-8 text-center">
          <div className="mb-4 font-mono text-sm text-red-400">
            Gift not found
          </div>
          <p className="text-text-secondary mb-6 font-mono text-xs">
            This gift may have expired or the link is invalid.
          </p>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="font-mono">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
