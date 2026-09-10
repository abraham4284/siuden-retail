type AnnouncementBarProps = {
  message?: string;
};

export function AnnouncementBar({ message }: AnnouncementBarProps) {
  if (!message) {
    return null;
  }

  return (
    <aside
      aria-label="Anuncio de la tienda"
      className="bg-[var(--store-primary)] px-4 py-2 text-center text-xs font-medium tracking-[0.2em] text-white"
    >
      {message}
    </aside>
  );
}
