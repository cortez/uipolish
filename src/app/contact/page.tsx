import { InfoPageView, infoMetadata } from "@/components/info-page";
import { INFO_PAGES } from "@/lib/info-pages";

const PAGE = INFO_PAGES.contact;

export const metadata = infoMetadata(PAGE);

export default function Page() {
  return <InfoPageView page={PAGE} />;
}
