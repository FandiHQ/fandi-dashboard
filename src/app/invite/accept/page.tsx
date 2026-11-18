import { redirect } from 'next/navigation';

/**
 * /invite/accept: where the old Supabase team-invitation email landed.
 * Team invitations now use Fandi's own links (`/invitacion#t=…`, see
 * fandi-api docs/rfc/invitations-and-admin.md); a link from an old email
 * carries a Supabase token that no longer means anything. Send it to the
 * invitation page, which explains that the link is not valid and how to
 * get a new one. The fragment of the old link never reaches the server.
 */
export default function LegacyInviteAcceptPage(): never {
    redirect('/invitacion');
}
