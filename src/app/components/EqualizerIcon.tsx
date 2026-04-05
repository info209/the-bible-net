export default function EqualizerIcon({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end justify-center gap-0.5 ${className}`}>
      <div className="w-1 bg-current rounded-full animate-equalizer-1" style={{ height: '60%' }} />
      <div className="w-1 bg-current rounded-full animate-equalizer-2" style={{ height: '100%' }} />
      <div className="w-1 bg-current rounded-full animate-equalizer-3" style={{ height: '80%' }} />
    </div>
  );
}
