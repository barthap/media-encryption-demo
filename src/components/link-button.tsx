import { Href, useRouter } from 'expo-router';
import { type ComponentProps } from 'react';
import Button from './ui/button';

type Props = Omit<ComponentProps<typeof Button>, 'onPress'> & { href: Href & string };

export function LinkButton({ href, ...rest }: Props) {
  const router = useRouter();

  const onPress = () => {
    router.navigate(href);
  }

  return (
    <Button onPress={onPress} {...rest} />
  );
}
