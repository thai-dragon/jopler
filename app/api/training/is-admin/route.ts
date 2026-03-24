import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPrimaryAdminEmail, isForPublic, isSuperadmin, teamDeploymentEnabled } from "@/lib/config";
import { emailInAllowlist, sessionIsGuest } from "@/lib/authz";
import {
  canAccessTeamFeatures,
  canRunAdminHeavyOps,
  canUseBillableAi,
} from "@/lib/access-policy";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email ?? null;
    const guest = sessionIsGuest(session);
    const superadmin = isSuperadmin(email);

    let inList = false;
    if (email && !guest) {
      inList = await emailInAllowlist(email);
    }
    const primary =
      !!email &&
      getPrimaryAdminEmail().trim().toLowerCase() !== "" &&
      email.toLowerCase() === getPrimaryAdminEmail().trim().toLowerCase();

    const canSeeTeam = canAccessTeamFeatures({
      authenticated: !!email,
      isGuest: guest,
      teamDeploymentEnabled: teamDeploymentEnabled(),
      emailInAllowlist: inList,
      isPrimaryAdmin: primary,
    });

    const canRunHeavyOps = !!email
      ? canRunAdminHeavyOps({
          authenticated: true,
          isGuest: guest,
          isSuperadmin: superadmin,
          restrictHeavyOpsToSuperadmin: isForPublic(),
        })
      : false;

    const canUseAi = !!email
      ? canUseBillableAi({ authenticated: true, isGuest: guest })
      : false;

    return NextResponse.json({
      isSuperadmin: superadmin,
      isGuest: guest,
      canSeeTeam,
      canRunHeavyOps,
      canUseAi,
    });
  } catch {
    return NextResponse.json({
      isSuperadmin: false,
      isGuest: false,
      canSeeTeam: false,
      canRunHeavyOps: false,
      canUseAi: false,
    });
  }
}
