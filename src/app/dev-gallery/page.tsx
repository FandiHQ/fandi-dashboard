/**
 * DEV-ONLY: the Azul Bloque primitives on the real tokens, for visual
 * review without signing in. 404 in production builds.
 */
import { notFound } from 'next/navigation';
import { Gallery } from './gallery';

export default function DevGalleryPage() {
    if (process.env.NODE_ENV === 'production') notFound();
    return <Gallery />;
}
