import { LocalizedText } from "@/components/i18n/LocalizedText";
import { SkeletonBlock, SkeletonTopBar } from "@/components/hrms/Skeleton";
import { cardClass } from "@/components/ui/styles";

// Same white page, padding, and cards as the profile page (HrmsShell), so the
// layout does not change colour when the data arrives.
export default function EmployeeProfileLoading() {
  return (
    <div className="min-h-screen bg-white" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only"><LocalizedText id="Memuat profil pegawai…" en="Loading employee profile…" /></span>
      <SkeletonTopBar />
      <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8" aria-hidden="true">
        <div className="mx-auto max-w-[1240px] space-y-6 xl:space-y-7">
          <div className="space-y-3"><SkeletonBlock className="h-4 w-32" /><SkeletonBlock className="h-7 w-52 max-w-full" /></div>
          <div className={`${cardClass} p-6 sm:p-8`}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <SkeletonBlock className="size-[90px] shrink-0 rounded-full" />
              <div className="w-full max-w-lg space-y-3"><SkeletonBlock className="h-6 w-48 max-w-full" /><SkeletonBlock className="h-4 w-64 max-w-full" /><SkeletonBlock className="h-4 w-80 max-w-full" /><SkeletonBlock className="h-10 w-full" /></div>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div className={`space-y-4 p-6 ${cardClass}`} key={index}>
                <SkeletonBlock className="h-5 w-40" /><SkeletonBlock className="h-4 w-3/4" /><SkeletonBlock className="h-4 w-1/2" /><SkeletonBlock className="h-4 w-2/3" />
              </div>
            ))}
            <div className={`space-y-4 p-6 lg:col-span-2 ${cardClass}`}><SkeletonBlock className="h-5 w-40" /><SkeletonBlock className="h-16 w-full" /></div>
          </div>
        </div>
      </main>
    </div>
  );
}
