import Image from 'next/image';

interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
    >
      <Image
        src="/pranax-logo.png"
        alt="PranaX"
        width={1080}
        height={1080}
        priority
        className="h-full w-full scale-[1.88] object-cover"
      />
    </span>
  );
}
