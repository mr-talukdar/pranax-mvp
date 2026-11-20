import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { prisma, withVerifiedStudioContext } from '@pranax/database';

const TARGET_STUDIO_ID = 'd9b73462-1111-4000-8000-000000000001';
const TARGET_STUDIO_NAME = 'ARS Pilates & Fitness';
const demoCredentials = JSON.parse(
  readFileSync(
    new URL('../public/demo-credentials.json', import.meta.url),
    'utf8',
  ),
);
const DEMO_EMAIL = demoCredentials.email;
const DEMO_PASSWORD = demoCredentials.password;

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
    throw new Error('Required Supabase environment variables are missing.');
  }

  console.log(
    '[1/5] Inspecting Supabase configuration and existing Auth users...',
  );
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersData, error: listError } =
    await adminClient.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  console.log(
    `Found ${usersData.users.length} existing Supabase Auth user(s).`,
  );

  let demoUser = usersData.users.find((u) => u.email === DEMO_EMAIL);
  const password = DEMO_PASSWORD;

  if (demoUser) {
    console.log(`Existing demo user found: ${demoUser.id} (${demoUser.email})`);
    const { data: updateData, error: updateError } =
      await adminClient.auth.admin.updateUserById(demoUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          fullName: 'ARS Pilates Demo Owner',
          role: 'OWNER',
          studioId: TARGET_STUDIO_ID,
        },
      });
    if (updateError) {
      throw new Error(
        `Failed to update demo user password: ${updateError.message}`,
      );
    }
    demoUser = updateData.user;
    console.log('Demo user credentials updated.');
  } else {
    console.log(`Creating new demo user: ${DEMO_EMAIL}...`);
    const { data: createData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: DEMO_EMAIL,
        password,
        email_confirm: true,
        user_metadata: {
          fullName: 'ARS Pilates Demo Owner',
          role: 'OWNER',
          studioId: TARGET_STUDIO_ID,
        },
      });
    if (createError) {
      throw new Error(`Failed to create demo user: ${createError.message}`);
    }
    demoUser = createData.user;
    console.log(`Demo user created with ID: ${demoUser.id}`);
  }

  // Save credentials to secrets/demo-credentials.json
  const secretsDir = resolve(process.cwd(), 'secrets');
  if (!existsSync(secretsDir)) {
    mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
  }

  const credentialsPath = resolve(secretsDir, 'demo-credentials.json');
  const credentialsData = {
    authUserId: demoUser.id,
    email: DEMO_EMAIL,
    password,
    studioId: TARGET_STUDIO_ID,
    studioName: TARGET_STUDIO_NAME,
    role: 'OWNER',
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(credentialsPath, JSON.stringify(credentialsData, null, 2), {
    mode: 0o600,
  });
  try {
    chmodSync(credentialsPath, 0o600);
  } catch {
    // best effort on non-POSIX
  }
  console.log(
    `[2/5] Saved demo credentials safely to ${credentialsPath} (mode 0600, gitignored).`,
  );

  // Establish studio and StudioUser membership in database
  console.log(
    '[3/5] Establishing synthetic Studio and StudioUser OWNER membership in PostgreSQL...',
  );
  await prisma.studio.upsert({
    where: { id: TARGET_STUDIO_ID },
    update: {
      name: TARGET_STUDIO_NAME,
      timezone: 'Asia/Kolkata',
      isSynthetic: true,
    },
    create: {
      id: TARGET_STUDIO_ID,
      name: TARGET_STUDIO_NAME,
      timezone: 'Asia/Kolkata',
      isSynthetic: true,
    },
  });

  const membership = await prisma.studioUser.upsert({
    where: {
      studioId_authUserId: {
        studioId: TARGET_STUDIO_ID,
        authUserId: demoUser.id,
      },
    },
    update: {
      role: 'OWNER',
    },
    create: {
      id: randomUUID(),
      studioId: TARGET_STUDIO_ID,
      authUserId: demoUser.id,
      role: 'OWNER',
    },
  });
  console.log(
    `Established OWNER membership: StudioUser ID ${membership.id}, Role: ${membership.role}`,
  );

  // Test and verify
  console.log('[4/5] Testing sign-in and JWT issuance with demo account...');
  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authSessionData, error: signInError } =
    await publicClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password,
    });

  if (signInError || !authSessionData.session) {
    throw new Error(
      `Sign-in failed: ${signInError?.message ?? 'No session returned'}`,
    );
  }

  const session = authSessionData.session;
  const decodedJwt = decodeJwtPayload(session.access_token);
  console.log('Sign-in SUCCESS:');
  console.log(` - User ID from session: ${session.user.id}`);
  console.log(` - JWT sub: ${decodedJwt.sub}`);
  console.log(` - JWT aud: ${decodedJwt.aud}`);
  console.log(` - JWT role: ${decodedJwt.role}`);
  console.log(` - JWT exp: ${new Date(decodedJwt.exp * 1000).toISOString()}`);
  console.log(` - Refresh token present: ${Boolean(session.refresh_token)}`);

  if (session.user.id !== demoUser.id || decodedJwt.sub !== demoUser.id) {
    throw new Error('Session user ID does not match expected demo user ID.');
  }

  console.log(
    '[5/5] Testing server-side context resolution & access enforcement...',
  );

  // Test 5b: Server-side context resolution confirms OWNER membership
  const resolvedRole = await withVerifiedStudioContext(
    demoUser.id,
    TARGET_STUDIO_ID,
    async (tx) => {
      const record = await tx.studioUser.findFirst({
        where: { studioId: TARGET_STUDIO_ID, authUserId: demoUser.id },
        select: { id: true, role: true, studioId: true },
      });
      return record;
    },
  );

  if (!resolvedRole || resolvedRole.role !== 'OWNER') {
    throw new Error(
      `Expected role OWNER, got: ${JSON.stringify(resolvedRole)}`,
    );
  }
  console.log(
    ` - Verification 5b PASSED: Resolved user ${demoUser.id} in studio ${TARGET_STUDIO_ID} with role OWNER.`,
  );

  // Test 5c: Cross-studio access rejection
  const foreignStudioId = 'd9b73462-2222-4000-8000-000000000002';
  let crossStudioBlocked = false;
  try {
    await withVerifiedStudioContext(demoUser.id, foreignStudioId, async () => {
      return true;
    });
  } catch (err) {
    crossStudioBlocked = true;
    console.log(
      ` - Verification 5c PASSED: Cross-studio access to ${foreignStudioId} rejected with: ${err.message}`,
    );
  }
  if (!crossStudioBlocked) {
    throw new Error('Cross-studio access was not blocked!');
  }

  // Test 5d: Revoked / non-member user rejection
  const unauthorizedUserId = randomUUID();
  let nonMemberBlocked = false;
  try {
    await withVerifiedStudioContext(
      unauthorizedUserId,
      TARGET_STUDIO_ID,
      async () => {
        return true;
      },
    );
  } catch (err) {
    nonMemberBlocked = true;
    console.log(
      ` - Verification 5d PASSED: User without membership rejected with: ${err.message}`,
    );
  }
  if (!nonMemberBlocked) {
    throw new Error('Unauthorized user access was not blocked!');
  }

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
}

run()
  .catch((err) => {
    console.error('Execution error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
