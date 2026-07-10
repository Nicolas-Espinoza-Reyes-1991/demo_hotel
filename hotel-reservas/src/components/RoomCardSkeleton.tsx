export function RoomCardSkeleton() {
  return (
    <article className="room-card room-card--skeleton" aria-hidden="true">
      <div className="room-card__media skeleton-shimmer" />
      <div className="room-card__body space-y-3">
        <div className="skeleton-line h-6 w-[78%] rounded-md" />
        <div className="space-y-2">
          <div className="skeleton-line h-3.5 w-full rounded" />
          <div className="skeleton-line h-3.5 w-[92%] rounded" />
          <div className="skeleton-line h-3.5 w-[85%] rounded" />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <div className="skeleton-line h-5 w-14 rounded-full" />
          <div className="skeleton-line h-5 w-16 rounded-full" />
          <div className="skeleton-line h-5 w-12 rounded-full" />
        </div>
        <div className="skeleton-line mt-2 h-11 w-full rounded-lg" />
      </div>
    </article>
  );
}
