import clsx from 'clsx';
import wordmarkSrc from '../assets/pulseops-wordmark.png';
import iconSrc from '../assets/pulseops-icon.svg?url';

/**
 * Uses Vite-resolved asset URLs (content-hashed in production) so browsers do not
 * keep serving a stale /public filename from cache.
 *
 * @param {'wordmark' | 'icon'} variant — wordmark = full art; icon = tab-style mark
 */
export default function BrandLogo({ variant = 'wordmark', className, imgClassName }) {
  if (variant === 'icon') {
    return (
      <img
        src={iconSrc}
        alt=""
        width={32}
        height={32}
        className={clsx('shrink-0 object-contain', className, imgClassName)}
        role="presentation"
        decoding="async"
      />
    );
  }

  return (
    <img
      src={wordmarkSrc}
      alt="PulseOps"
      className={clsx('h-8 w-auto max-w-[min(100%,280px)] object-left object-contain', className, imgClassName)}
      decoding="async"
    />
  );
}
