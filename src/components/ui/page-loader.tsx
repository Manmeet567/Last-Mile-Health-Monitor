import { DashboardCard } from '@/components/ui/dashboard-card';
import { SkeletonBlock } from '@/components/ui/skeleton-block';

export function PageLoader({
  label = 'Loading',
  title = 'Preparing the next screen',
  description = 'The app is loading this route and keeping all of your local data in place.',
}: {
  label?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <DashboardCard className="p-7 md:p-8">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7EA8E6]">
            {label}
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#F3F7FF] md:text-[2.2rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[#A7B7D6]">
            {description}
          </p>
        </div>
      </DashboardCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.82fr)_minmax(338px,1fr)]">
        <div className="space-y-6">
          <DashboardCard className="p-7 lg:p-8">
            <div className="space-y-5">
              <SkeletonBlock className="h-3.5 w-28" />
              <SkeletonBlock className="h-12 w-80 max-w-full rounded-[18px]" />
              <SkeletonBlock className="h-5 w-56 max-w-full" />
            </div>
          </DashboardCard>

          <DashboardCard className="p-7 lg:p-8">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <SkeletonBlock className="h-9 w-52 rounded-[16px]" />
                  <SkeletonBlock className="h-4 w-72 max-w-full" />
                </div>
                <SkeletonBlock className="h-4 w-16" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-[16px] bg-[#1A2542] px-5 py-[1.125rem]"
                  >
                    <SkeletonBlock className="h-3.5 w-24" />
                    <SkeletonBlock className="mt-5 h-8 w-28 rounded-[12px]" />
                    <SkeletonBlock className="mt-3 h-4 w-40 max-w-full" />
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <DashboardCard key={index} className="p-6">
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <SkeletonBlock className="h-8 w-44 rounded-[14px]" />
                    <SkeletonBlock className="h-4 w-40" />
                  </div>
                  <SkeletonBlock className="h-9 w-16 rounded-full" />
                </div>
                <SkeletonBlock className="h-3 w-full rounded-full" />
                <SkeletonBlock className="h-20 w-full rounded-[16px]" />
                <SkeletonBlock className="h-14 w-full rounded-[16px]" />
              </div>
            </DashboardCard>
          ))}
        </div>
      </div>
    </div>
  );
}
