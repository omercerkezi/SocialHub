import { useEffect, useRef } from "react";

export function usePage(title) {
  const ref = useRef(null);
  useEffect(() => {
    document.title = `${title} · SocialHub`;
    ref.current?.focus();
  }, [title]);
  return ref;
}
