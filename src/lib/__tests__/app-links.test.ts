import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    APP_STORE_URL,
    DOWNLOAD_FALLBACK,
    PLAY_STORE_URL,
    downloadTarget,
} from '../app-links.ts';

const UA = {
    iphoneSafari:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    iphoneInstagram:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 340.0.0.22.109 (iPhone15,3; iOS 17_5; es_CO; es; scale=3.00; 1290x2796; 620167431)',
    ipadLegacy:
        'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
    ipod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1',
    androidChrome:
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    androidWhatsAppWebView:
        'Mozilla/5.0 (Linux; Android 13; moto g54 5G Build/T1TDS33.75-38-1-4; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36',
    androidTablet:
        'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    windowsChrome:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    macSafari:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
    linuxFirefox:
        'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
    windowsPhone:
        'Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Mobile Safari/537.36 Edge/15.15063',
    googlebot:
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

describe('downloadTarget (/descargar redirect)', () => {
    test('iPhone, iPad and iPod go to the App Store, in-app browsers included', () => {
        for (const ua of [UA.iphoneSafari, UA.iphoneInstagram, UA.ipadLegacy, UA.ipod]) {
            assert.equal(downloadTarget(ua), APP_STORE_URL, ua);
        }
    });

    test('Android phones, tablets and WebViews go to Google Play', () => {
        for (const ua of [UA.androidChrome, UA.androidWhatsAppWebView, UA.androidTablet]) {
            assert.equal(downloadTarget(ua), PLAY_STORE_URL, ua);
        }
    });

    test('desktops, bots and Windows Phone land on the badges', () => {
        for (const ua of [
            UA.windowsChrome,
            UA.macSafari,
            UA.linuxFirefox,
            UA.windowsPhone,
            UA.googlebot,
        ]) {
            assert.equal(downloadTarget(ua), DOWNLOAD_FALLBACK, ua);
        }
    });

    test('a missing or empty User-Agent lands on the badges', () => {
        assert.equal(downloadTarget(null), DOWNLOAD_FALLBACK);
        assert.equal(downloadTarget(undefined), DOWNLOAD_FALLBACK);
        assert.equal(downloadTarget(''), DOWNLOAD_FALLBACK);
    });

    test('store URLs are the storefront-neutral listings', () => {
        assert.equal(APP_STORE_URL, 'https://apps.apple.com/app/fandi/id6823753589');
        assert.equal(PLAY_STORE_URL, 'https://play.google.com/store/apps/details?id=co.fandi.app');
        assert.equal(DOWNLOAD_FALLBACK, '/#descargar');
    });
});
