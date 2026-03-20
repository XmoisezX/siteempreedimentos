import { supabase } from './supabaseClient';

export interface Broker {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  last_assigned_at: string | null;
}

/**
 * Fetches the next broker in the rotation, updates their last_assigned_at timestamp,
 * and returns their phone number.
 * 
 * Logic: Circular rotation (Round Robin) based on the oldest last_assigned_at among active brokers.
 */
export async function getRotatedBrokerPhone(): Promise<string> {
  try {
    // 1. Fetch all active brokers
    const { data: brokers, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('is_active', true)
      .order('last_assigned_at', { ascending: true, nullsFirst: true });

    if (error) {
      console.error('Error fetching brokers for rotation:', error);
      return '5553994445566'; // Fallback to original main number
    }

    if (!brokers || brokers.length === 0) {
      console.warn('No active brokers found for rotation.');
      return '5553994445566'; // Fallback
    }

    // 2. The first broker in the sorted list is the one who hasn't received a lead for the longest time
    const nextBroker = brokers[0];

    // 3. Update their last_assigned_at timestamp to "now"
    // We don't necessarily NEED to wait for this to complete before returning the phone
    // but doing it now ensures the next call gets a different result.
    await supabase
      .from('brokers')
      .update({ last_assigned_at: new Date().toISOString() })
      .eq('id', nextBroker.id);

    return nextBroker.phone;
  } catch (err) {
    console.error('Unexpected error in lead rotation:', err);
    return '5553994445566'; // Fallback
  }
}
