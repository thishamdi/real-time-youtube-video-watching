'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import ReactPlayer from 'react-player/lazy';
import { VideoPlayerProps, ReactPlayerProgress, YouTubePlayerState } from '../types/video';

// Add type for YouTube config
interface YouTubeConfig {
    playerVars?: {
        modestbranding?: number;
        enablejsapi?: number;
        playsinline?: number;
        origin?: string;
        onStateChange?: (event: { data: number }) => void;
    };
}

const SYNC_THRESHOLD = 1; // Reduced to 1 second for tighter sync
const BUFFER_SYNC_DELAY = 500; // Wait for buffer to stabilize

const extractYouTubeVideoId = (url: string) => {
    let videoId = null;
    
    // Handle youtube.com URLs
    const normalMatch = url.match(/[?&]v=([^&]+)/);
    if (normalMatch) {
        videoId = normalMatch[1];
    }
    
    // Handle youtu.be URLs
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) {
        videoId = shortMatch[1];
    }
    
    // Handle playlist URLs
    if (url.includes('playlist')) {
        const videoMatch = url.match(/[?&]v=([^&]+)/);
        if (videoMatch) {
            videoId = videoMatch[1];
        }
    }

    return videoId;
};

export default function UnifiedVideoPlayer({ 
    url, 
    isPlaying, 
    currentTime, 
    onPlay, 
    onPause, 
    onSeek, 
    onTimeUpdate 
}: VideoPlayerProps) {
    const playerRef = useRef<ReactPlayer>(null);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [playerState, setPlayerState] = useState<number>(0);
    const lastUpdateTime = useRef(Date.now());
    const localTime = useRef(currentTime);

    // Keep track of whether player should actually be playing
    const shouldPlay = isPlaying && isReady;

    // Track YouTube specific state
    const handleStateChange = useCallback((event: { data: number }) => {
        setPlayerState(event.data);
        
        // YouTube States: -1 (unstarted) | 0 (ended) | 1 (playing) | 2 (paused) | 3 (buffering)
        switch (event.data) {
            case YouTubePlayerState.PLAYING:
                setIsBuffering(false);
                if (playerRef.current) {
                    onPlay(playerRef.current.getCurrentTime());
                }
                break;
            case YouTubePlayerState.PAUSED:
                setIsBuffering(false);
                if (playerRef.current) {
                    onPause(playerRef.current.getCurrentTime());
                }
                break;
            case YouTubePlayerState.BUFFERING:
                setIsBuffering(true);
                break;
        }
    }, [onPlay, onPause]);

    // Improved progress tracking
    const handleProgress = useCallback(({ playedSeconds }: ReactPlayerProgress) => {
        if (isBuffering || playerState !== YouTubePlayerState.PLAYING) return;

        const now = Date.now();
        if (now - lastUpdateTime.current > 1000) {
            lastUpdateTime.current = now;
            onTimeUpdate(playedSeconds, true);
        }
    }, [isBuffering, playerState, onTimeUpdate]);

    // Enhanced sync logic
    useEffect(() => {
        if (!isReady || !playerRef.current) return;

        const player = playerRef.current;
        const currentPlayerTime = player.getCurrentTime();

        if (Math.abs(currentPlayerTime - currentTime) > SYNC_THRESHOLD) {
            if (isBuffering) {
                // Wait for buffer to stabilize
                const timeout = setTimeout(() => {
                    player.seekTo(currentTime, 'seconds');
                }, BUFFER_SYNC_DELAY);
                return () => clearTimeout(timeout);
            } else {
                player.seekTo(currentTime, 'seconds');
            }
        }
    }, [currentTime, isReady, isBuffering]);

    const handleReady = useCallback(() => {
        if (playerRef.current) {
            // Only seek if we have a time to seek to
            if (currentTime > 0) {
                playerRef.current.seekTo(currentTime, 'seconds');
            }
            setIsReady(true);
        }
    }, [currentTime]);

    const cleanUrl = useMemo(() => {
        const videoId = extractYouTubeVideoId(url);
        if (!videoId) return url;
        return `https://www.youtube.com/watch?v=${videoId}`;
    }, [url]);

    return (
        <div className="aspect-video relative">
            <ReactPlayer
                ref={playerRef}
                url={cleanUrl}
                playing={shouldPlay}
                controls={true}
                width="100%"
                height="100%"
                onProgress={handleProgress}
                onPlay={() => {
                    if (playerRef.current) {
                        onPlay(playerRef.current.getCurrentTime());
                    }
                }}
                onPause={() => {
                    if (playerRef.current) {
                        onPause(playerRef.current.getCurrentTime());
                    }
                }}
                onBuffer={() => setIsBuffering(true)}
                onBufferEnd={() => setIsBuffering(false)}
                onReady={handleReady}
                progressInterval={500}
                config={{
                    youtube: {
                        playerVars: { 
                            modestbranding: 1,
                            enablejsapi: 1,
                            playsinline: 1,
                            origin: window.location.origin,
                            rel: 0,         // Disable related videos
                            showinfo: 0,    // Hide video title and player actions
                            controls: 1,    // Show player controls
                            fs: 1,          // Enable fullscreen button
                            autoplay: 0     // Prevent autoplay until we're ready
                        }
                    }
                }}
            />
            {!isReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                    Loading player...
                </div>
            )}
        </div>
    );
}
