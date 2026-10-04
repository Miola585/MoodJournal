import { supabase } from '../supabaseClient';

export async function listSupportRequests(userId, admin = false) {
  let query = supabase.from('support_requests').select('*').order('created_at', { ascending: false });
  if (!admin) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listSupportAuthors() {
  const { data, error } = await supabase.from('profiles').select('user_id, username');
  if (error) throw error;
  return data || [];
}

export async function createSupportRequest(userId, request) {
  const { data, error } = await supabase.from('support_requests').insert({ user_id: userId, ...request }).select().single();
  if (error) throw error;
  return data;
}

export async function listSupportMessages(requestId) {
  const { data, error } = await supabase.from('support_messages').select('*').eq('request_id', requestId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createSupportMessage(requestId, senderId, body) {
  const { data, error } = await supabase.from('support_messages')
    .insert({ request_id: requestId, sender_id: senderId, body }).select().single();
  if (error) throw error;
  return data;
}

export async function updateSupportRequest(requestId, changes) {
  const { data, error } = await supabase.from('support_requests').update(changes).eq('id', requestId).select().single();
  if (error) throw error;
  return data;
}

export async function countNewSupportRequests() {
  const { count, error } = await supabase.from('support_requests').select('id', { count: 'exact', head: true }).eq('status', 'new');
  if (error) throw error;
  return count || 0;
}
