"use client";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

/**
 * A lightweight client-side <img> wrapper that swaps to a fallback
 * when the original src fails to load. Use this instead of bare <img>
 * with onError inside Server Components.
 */
export default function FallbackImg({ fallbackSrc = "/logo.png", onError, ...props }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={props.alt ?? ""}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
        onError?.(e);
      }}
    />
  );
}
