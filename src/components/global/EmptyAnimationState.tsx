import { Film } from "lucide-react";

export interface EmptyAnimationStateProps {
  message?: string;
  submessage?: string;
}

export default function EmptyAnimationState({
  message = "Tidak ada animasi dipilih",
  submessage = "Pilih atau buat source di panel kiri untuk mulai",
}: EmptyAnimationStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <Film className="w-12 h-12 text-[var(--color-text-secondary)] mb-3" />
      <p className="text-sm font-bold text-[var(--color-text-primary)]">{message}</p>
      {submessage && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{submessage}</p>
      )}
    </div>
  );
}