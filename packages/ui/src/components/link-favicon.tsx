import * as React from 'react';
import { Link2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

function faviconSource(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return new URL('/favicon.ico', url.origin).href;
  } catch {
    return null;
  }
}

function LinkFavicon({
  url,
  size = 'default',
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  url: string;
  size?: 'default' | 'sm';
}) {
  const source = faviconSource(url);
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const imageSource =
    source !== null && failedSource !== source ? source : null;

  return (
    <span
      data-slot="link-favicon"
      data-size={size}
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/50 text-muted-foreground data-[size=sm]:size-6 data-[size=sm]:rounded-md [&>img]:size-4 [&>img]:object-contain [&>svg]:size-3.5 data-[size=sm]:[&>img]:size-3.5 data-[size=sm]:[&>svg]:size-3',
        className,
      )}
      {...props}
    >
      {imageSource ? (
        <img
          src={imageSource}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(imageSource)}
        />
      ) : (
        <Link2 />
      )}
    </span>
  );
}

export { LinkFavicon };
