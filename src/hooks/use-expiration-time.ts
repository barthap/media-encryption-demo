import React from 'react';

export function useExpirationTime(
  expirationDate: Date | null,
): `${string}:${string}` | 'expired' | null {
  const [expiresIn, setExpiration] = React.useState<`${string}:${string}` | 'expired' | null>(null);

  React.useEffect(() => {
    if (!expirationDate) {
      setExpiration(null);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((expirationDate.getTime() - now.getTime()) / 1000);

      if (duration <= 0) {
        setExpiration('expired');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(duration / 60).toLocaleString(undefined, {
        minimumIntegerDigits: 2,
      });
      const seconds = (duration % 60).toLocaleString(undefined, { minimumIntegerDigits: 2 });
      setExpiration(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationDate]);

  return expiresIn;
}
