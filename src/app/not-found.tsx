import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

// Azul Bloque 404: blue canvas, one hero line, ONE lime action back home.
export default function NotFound() {
    const t = useTranslations("notFoundPage");

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-blue px-4 py-16 text-center text-white sm:px-6">
            <Image
                src="/fandi-tile.png"
                alt="Fandi"
                width={56}
                height={56}
                unoptimized
                className="size-14 rounded-[14px] border-2 border-ink shadow-ext-sm"
            />
            <p className="label-mono mt-10 text-[11px] text-lilac">{t("eyebrow")}</p>
            <h1 className="mt-4 max-w-[900px] break-words font-hero text-[40px] text-white sm:text-[56px] md:text-[72px]">
                {t("title")}
            </h1>
            <p className="mt-6 max-w-[520px] text-[17px] leading-relaxed text-lilac">
                {t("body")}
            </p>
            <Button asChild size="lg" className="mt-10">
                <Link href="/">{t("cta")}</Link>
            </Button>
        </main>
    );
}
