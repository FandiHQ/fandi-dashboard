import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/components/layout/admin-nav-config';

/** /admin opens on Ídolos. */
export default function AdminHome() {
    redirect(ADMIN_HOME);
}
