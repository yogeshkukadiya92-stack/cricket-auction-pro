// Every registration is accepted automatically. Preserve auction and payment state.
export const approveRegistration = player => ({ ...player, approvalStatus: 'APPROVED' });

export async function migrateAutomaticApproval(client) {
  await client.query(`UPDATE players SET data=jsonb_set(data,'{approvalStatus}','"APPROVED"'::jsonb)
    WHERE data->>'approvalStatus' IS DISTINCT FROM 'APPROVED'`);
}
