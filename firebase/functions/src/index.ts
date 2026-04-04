import * as functions  from 'firebase-functions';
import * as admin       from 'firebase-admin';
import * as crypto      from 'crypto';

admin.initializeApp();

const db      = admin.firestore();
const authSdk = admin.auth();

const ADMIN_EMAIL   = 'emanaproducoes@gmail.com';
const APPROVAL_DAYS = 7;

// ─── 1. onUserCreate — configura perfil e claims de admin ─────────────────────
export const onUserCreate = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user) => {
    const { uid, email, displayName, photoURL } = user;

    const isAdmin = email === ADMIN_EMAIL;

    if (isAdmin) {
      await authSdk.setCustomUserClaims(uid, { admin: true });
    }

    await db.doc(`users/${uid}`).set(
      {
        role:      isAdmin ? 'admin' : 'member',
        name:      displayName ?? null,
        email:     email       ?? null,
        photoURL:  photoURL    ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    functions.logger.info(`[onUserCreate] uid=${uid} email=${email} admin=${isAdmin}`);
  });

// ─── 2. onUserDelete — limpa dados do usuário ─────────────────────────────────
export const onUserDelete = functions
  .region('us-central1')
  .auth.user()
  .onDelete(async (user) => {
    const { uid } = user;

    // Remove all user sub-collections (batch delete)
    const SUB_COLLECTIONS = [
      'posts', 'agendamentos', 'emAnalise', 'aprovados',
      'rejeitados', 'revisao', 'campanhas', 'trafegoPago',
      'connectedAccounts', 'preferences', 'stats',
    ];

    const batch = db.batch();

    for (const col of SUB_COLLECTIONS) {
      const snap = await db.collection(`users/${uid}/${col}`).limit(500).get();
      snap.docs.forEach((d) => batch.delete(d.ref));
    }

    batch.delete(db.doc(`users/${uid}`));
    await batch.commit();

    functions.logger.info(`[onUserDelete] Cleaned data for uid=${uid}`);
  });

// ─── 3. onApprovalUpdate — processa resposta de aprovação ────────────────────
export const onApprovalUpdate = functions
  .region('us-central1')
  .firestore.document('approvals/{token}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Só processa quando status muda de 'pending' para outro
    if (before['status'] !== 'pending' || after['status'] === 'pending') return;

    const { uid, agendamentoId, status } = after as {
      uid:           string;
      agendamentoId: string;
      status:        string;
    };

    if (!uid || !agendamentoId) {
      functions.logger.warn('[onApprovalUpdate] uid ou agendamentoId ausente', after);
      return;
    }

    const serverTs  = admin.firestore.FieldValue.serverTimestamp();
    const postRef   = db.doc(`users/${uid}/posts/${agendamentoId}`);
    const postSnap  = await postRef.get();

    if (!postSnap.exists) {
      functions.logger.warn(`[onApprovalUpdate] Post ${agendamentoId} não encontrado`);
      return;
    }

    const postData = postSnap.data()!;

    // Mapeia status de aprovação para status de post
    const statusMap: Record<string, string> = {
      aprovado:  'aprovado',
      rejeitado: 'rejeitado',
      correcao:  'revisao',
    };

    const newPostStatus = statusMap[status] ?? status;

    // Atualiza post principal
    await postRef.update({
      status:    newPostStatus,
      updatedAt: serverTs,
    });

    // Move para subcoleção correta
    const colMap: Record<string, string | null> = {
      aprovado:  'aprovados',
      rejeitado: 'rejeitados',
      correcao:  'revisao',
    };

    const targetCol = colMap[status];
    if (targetCol) {
      await db
        .doc(`users/${uid}/${targetCol}/${agendamentoId}`)
        .set({ ...postData, status: newPostStatus, updatedAt: serverTs });
    }

    // Registra evento no histórico
    await db
      .collection(`users/${uid}/posts/${agendamentoId}/history`)
      .add({
        type:      'status_change',
        label:     `Status alterado para "${newPostStatus}" via aprovação`,
        timestamp: serverTs,
        meta:      { approvalStatus: status, token: context.params['token'] },
      });

    functions.logger.info(
      `[onApprovalUpdate] post=${agendamentoId} status=${newPostStatus}`
    );
  });

// ─── 4. cleanExpiredApprovals — limpeza diária de aprovações expiradas ────────
export const cleanExpiredApprovals = functions
  .region('us-central1')
  .pubsub.schedule('every 24 hours')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const now     = admin.firestore.Timestamp.now();
    const expired = await db
      .collection('approvals')
      .where('expiresAt', '<', now)
      .where('status', '==', 'pending')
      .limit(500)
      .get();

    if (expired.empty) {
      functions.logger.info('[cleanExpiredApprovals] Nenhuma aprovação expirada.');
      return;
    }

    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    functions.logger.info(
      `[cleanExpiredApprovals] Removidas ${expired.size} aprovações expiradas.`
    );
  });

// ─── 5. generateApprovalToken — callable function ─────────────────────────────
export const generateApprovalToken = functions
  .region('us-central1')
  .https.onCall(async (data: {
    postId:      string;
    creatives:   unknown[];
    caption:     string;
    platforms:   string[];
    responsavel: { nome: string; avatar: string; uid: string };
  }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login obrigatório.');
    }

    const { postId, creatives, caption, platforms, responsavel } = data;

    if (!postId) {
      throw new functions.https.HttpsError('invalid-argument', 'postId é obrigatório.');
    }

    const uid       = context.auth.uid;
    const token     = crypto.randomUUID();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + APPROVAL_DAYS * 24 * 60 * 60 * 1000)
    );

    await db.doc(`approvals/${token}`).set({
      agendamentoId: postId,
      uid,
      creatives:     creatives   ?? [],
      caption:       caption     ?? '',
      platforms:     platforms   ?? [],
      status:        'pending',
      responsavel:   responsavel ?? { nome: '', avatar: '', uid },
      createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    });

    // Atualiza o post com o token
    await db.doc(`users/${uid}/posts/${postId}`).update({
      approvalToken: token,
      status:        'em_analise',
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`[generateApprovalToken] token=${token} postId=${postId}`);

    return {
      token,
      url: `https://${process.env['NEXT_PUBLIC_APP_DOMAIN'] ?? 'localhost:3000'}/aprovacao?token=${token}`,
    };
  });

// ─── 6. onPostStatusChange — atualiza contadores de campanha ──────────────────
export const onPostStatusChange = functions
  .region('us-central1')
  .firestore.document('users/{uid}/posts/{postId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (before['status'] === after['status']) return;
    if (!after['campaignId'])                  return;

    const { uid }        = context.params as { uid: string; postId: string };
    const campaignId     = after['campaignId'] as string;
    const campaignRef    = db.doc(`users/${uid}/campanhas/${campaignId}`);

    // Re-count approved posts for this campaign
    const approvedSnap = await db
      .collection(`users/${uid}/posts`)
      .where('campaignId', '==', campaignId)
      .where('status', 'in', ['aprovado', 'publicado'])
      .get();

    await campaignRef.update({
      postsApproved: approvedSnap.size,
      updatedAt:     admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `[onPostStatusChange] campaign=${campaignId} approvedPosts=${approvedSnap.size}`
    );
  });

// ─── 7. setAdminClaim — callable para promover usuário a admin ────────────────
export const setAdminClaim = functions
  .region('us-central1')
  .https.onCall(async (data: { targetUid: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login obrigatório.');
    }

    // Apenas admin pode promover outros
    const callerClaims = context.auth.token;
    if (callerClaims['email'] !== ADMIN_EMAIL && !callerClaims['admin']) {
      throw new functions.https.HttpsError('permission-denied', 'Apenas o administrador pode realizar esta ação.');
    }

    const { targetUid } = data;
    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', 'targetUid é obrigatório.');
    }

    await authSdk.setCustomUserClaims(targetUid, { admin: true });
    await db.doc(`users/${targetUid}`).update({
      role:      'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`[setAdminClaim] targetUid=${targetUid} promovido a admin`);
    return { ok: true };
  });
