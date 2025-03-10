import supabase from '../config/supabase.js';

export const createRoom = async (videoUrl) => {
    const { data, error } = await supabase
        .from('rooms')
        .insert([{ video_url: videoUrl }])
        .select('*') // Add this to return the inserted record
        .single();

    if (error) {
        console.error('Supabase create room error:', error);
        return { data: null, error };
    }
    return { data, error: null };
};

export const getRoomById = async (roomId) => {
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
    return {
        data: data ? {
            ...data,
            current_time: data.current_playback_time // Map to new column name
        } : null,
        error
    };
};

export const updateVideoState = async (roomId, state) => {
    const updateData = {
        is_playing: state.is_playing,
        current_playback_time: state.current_playback_time || state.currentTime // Handle both naming conventions
    };

    const { data, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', roomId);
    
    return { data, error };
};