import supabase from '../config/supabase.js';

export const sendMessage = async (messageData) => {
    const { data, error } = await supabase
        .from('chat_messages')
        .insert([messageData]);
    return { data, error };
};

export const getMessages = async (roomId) => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
    return { data, error };
};