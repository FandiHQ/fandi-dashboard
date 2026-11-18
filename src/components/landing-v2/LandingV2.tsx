'use client';

import { MotionConfig } from 'framer-motion';
import { useTranslations } from 'next-intl';

import NavV2 from './NavV2';
import HeroScene from './HeroScene';
import FrustrationScene from './FrustrationScene';
import TurnScene from './TurnScene';
import RechargeScene from './RechargeScene';
import CategoriesScene from './CategoriesScene';
import AuctionScene from './AuctionScene';
import KeepScene from './KeepScene';
import IdolsScene from './IdolsScene';
import { DownloadScene, FaqScene, FooterV2, MidDownload } from './CloseScene';
import { ScrollProgress } from './ScrollAffordance';

/**
 * The Fandi landing page, rendered at `/`.
 *
 * Deliberately has NO global vh/scroll map: every pinned scene owns its
 * scroll through a local `useSceneProgress(ref)`, so sections can be
 * added, cut or reordered without desyncing each other.
 *
 * Only three scenes are pinned, the cinematic ones: the mic, the
 * frustration and "AHORA SÍ PASAS.", plus the categories simulation. The
 * explainers (recargas, subastas, insignias, ídolos) are normal flow:
 * real screens and readable blocks read faster than scroll-scrubbed beats.
 *
 * No loading cover: the hero is plain HTML on flat blue and paints at
 * once; the mic frames load on idle behind it.
 *
 * Reduced motion: MotionConfig drops the movement of every reveal (the
 * fade stays), scroll-linked values are pinned to their end state
 * (scroll.ts) and the sequences show one still frame.
 *
 * Narrative:
 *   §0 el micrófono   the hook, with the real CTAs in reach
 *   §1 la frustración no matter what you pay, you never pass the stage
 *   §2 el giro        ahora sí pasas, live and from anywhere
 *      descarga       the compact mid-page download moment
 *   #1 recargas       Fandis, your wallet, the event going live
 *   #2 oportunidades  the mechanic, simulated, then the real screens
 *   #3 subastas       the contrast: highest bid wins
 *   §  lo que queda   insignias + rank, win or lose
 *   §  ídolos         monetizamos · identificamos · fidelizamos
 *   §  descargar / faq / footer
 */
export default function LandingV2() {
    const t = useTranslations('landingV2');

    return (
        <MotionConfig reducedMotion="user">
            {/* "There is more": global, always on. */}
            <ScrollProgress />
            <NavV2 />

            {/* The mobile sticky bar's clearance lives in the footer (ink),
                not here: padding on <main> painted a blue band under it. */}
            <main id="main-content" className="bg-blue text-white">
                <h1 className="sr-only">{t('seoTitle')}</h1>

                <HeroScene />
                <FrustrationScene />
                <TurnScene />
                <MidDownload />
                <RechargeScene />
                <CategoriesScene />
                <AuctionScene />
                <KeepScene />
                <IdolsScene />
                <DownloadScene />
                <FaqScene />
                <FooterV2 />
            </main>
        </MotionConfig>
    );
}
