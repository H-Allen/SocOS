import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-48" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-28 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
