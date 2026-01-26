// lib/routepro/navigation.ts

export function openNavigation({
  lat,
  lng,
  address,
}: {
  lat?: number | null;
  lng?: number | null;
  address: string;
}) {
  let url = "";

  if (lat && lng) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      address
    )}`;
  }

  window.open(url, "_blank");
}
