import Image from "next/image";
import { siteConfig } from "@/config/site";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <>
      <Image src={siteConfig.logo.light} alt="" width={size} height={size} className="dark:hidden" />
      <Image src={siteConfig.logo.dark} alt="" width={size} height={size} className="hidden dark:block" />
    </>
  );
}
