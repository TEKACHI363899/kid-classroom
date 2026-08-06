import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalVideoTrack,
  LocalAudioTrack,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from 'livekit-client';

export interface LivekitServiceEvents {
  onRemoteTrackSubscribed?: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => void;
  onRemoteTrackUnsubscribed?: (
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) => void;
  onParticipantDisconnected?: (participant: RemoteParticipant) => void;
  onLocalStreamStarted?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: 'connected' | 'connecting' | 'disconnected' | 'reconnecting') => void;
  onScreenShareStopped?: () => void;
}

export class LivekitService {
  private room: Room | null = null;
  public localVideoTrack: LocalVideoTrack | null = null;
  public localAudioTrack: LocalAudioTrack | null = null;
  private events: LivekitServiceEvents = {};

  public async initialize(
    url: string,
    token: string,
    events: LivekitServiceEvents
  ): Promise<boolean> {
    this.events = events;
    try {
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        this.events.onRemoteTrackSubscribed?.(track, publication, participant);
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        this.events.onRemoteTrackUnsubscribed?.(track, publication, participant);
      });

      this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        this.events.onParticipantDisconnected?.(participant);
      });

      this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === 'connected' || state === 'connecting' || state === 'disconnected' || state === 'reconnecting') {
          this.events.onConnectionStateChange?.(state);
        }
      });

      await this.room.connect(url, token);
      console.log('Successfully connected to LiveKit room:', this.room.name);
      return true;
    } catch (error) {
      console.error('Failed to initialize LiveKit:', error);
      return false;
    }
  }

  public async startLocalMedia(audio: boolean = true, video: boolean = true): Promise<MediaStream | null> {
    if (!this.room) return null;
    const mediaStream = new MediaStream();

    if (video) {
      // Release old video track if it's dead/ended
      if (this.localVideoTrack && this.localVideoTrack.mediaStreamTrack && this.localVideoTrack.mediaStreamTrack.readyState === 'ended') {
        try {
          this.localVideoTrack.stop();
        } catch (e) {}
        this.localVideoTrack = null;
      }

      if (this.localVideoTrack) {
        // Reuse existing track, publish if not already published in this room
        const isPublished = Array.from(this.room.localParticipant.videoTrackPublications.values())
          .some((pub) => pub.track === this.localVideoTrack);
        if (!isPublished) {
          try {
            await this.room.localParticipant.publishTrack(this.localVideoTrack);
          } catch (pubErr) {
            console.warn('Video track publish warning (might be already publishing/published):', pubErr);
          }
        }
        if (this.localVideoTrack.mediaStreamTrack) {
          mediaStream.addTrack(this.localVideoTrack.mediaStreamTrack);
        }
      } else {
        try {
          // Publish local camera track using global helper
          const videoTrack = await createLocalVideoTrack({
            resolution: { width: 1280, height: 720, frameRate: 30 },
          });
          this.localVideoTrack = videoTrack;
          await this.room.localParticipant.publishTrack(videoTrack);
          
          if (videoTrack.mediaStreamTrack) {
            mediaStream.addTrack(videoTrack.mediaStreamTrack);
          }
        } catch (error) {
          console.warn('Could not initialize video track (e.g. no camera device):', error);
        }
      }
    }

    if (audio) {
      // Release old audio track if it's dead/ended
      if (this.localAudioTrack && this.localAudioTrack.mediaStreamTrack && this.localAudioTrack.mediaStreamTrack.readyState === 'ended') {
        try {
          this.localAudioTrack.stop();
        } catch (e) {}
        this.localAudioTrack = null;
      }

      if (this.localAudioTrack) {
        // Reuse existing track, publish if not already published in this room
        const isPublished = Array.from(this.room.localParticipant.audioTrackPublications.values())
          .some((pub) => pub.track === this.localAudioTrack);
        if (!isPublished) {
          try {
            await this.room.localParticipant.publishTrack(this.localAudioTrack);
          } catch (pubErr) {
            console.warn('Audio track publish warning (might be already publishing/published):', pubErr);
          }
        }
        if (this.localAudioTrack.mediaStreamTrack) {
          mediaStream.addTrack(this.localAudioTrack.mediaStreamTrack);
        }
      } else {
        try {
          // Publish local mic track using global helper
          const audioTrack = await createLocalAudioTrack();
          this.localAudioTrack = audioTrack;
          await this.room.localParticipant.publishTrack(audioTrack);

          if (audioTrack.mediaStreamTrack) {
            mediaStream.addTrack(audioTrack.mediaStreamTrack);
          }
        } catch (error) {
          console.warn('Could not initialize audio track (e.g. no microphone device):', error);
        }
      }
    }

    const localMediaStream = mediaStream;
    this.events.onLocalStreamStarted?.(localMediaStream);
    return localMediaStream;
  }

  public toggleAudio(enabled: boolean): void {
    if (this.localAudioTrack) {
      if (enabled) {
        this.localAudioTrack.unmute().catch((err: unknown) => console.warn('toggleAudio unmute error:', err));
      } else {
        this.localAudioTrack.mute().catch((err: unknown) => console.warn('toggleAudio mute error:', err));
      }
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.localVideoTrack) {
      if (enabled) {
        this.localVideoTrack.unmute().catch((err: unknown) => console.warn('toggleVideo unmute error:', err));
      } else {
        this.localVideoTrack.mute().catch((err: unknown) => console.warn('toggleVideo mute error:', err));
      }
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    if (!this.room) return null;
    try {
      const publication = await this.room.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        resolution: { width: 1920, height: 1080, frameRate: 30 },
        contentHint: 'text',
      });
      const track = publication?.track;

      if (track && track.mediaStreamTrack) {
        // Set contentHint to 'text' to ensure sharpness of text and documents
        if ('contentHint' in track.mediaStreamTrack) {
          track.mediaStreamTrack.contentHint = 'text';
        }

        const stream = new MediaStream([track.mediaStreamTrack]);
        
        track.mediaStreamTrack.addEventListener('ended', () => {
          this.stopScreenShare();
          this.events.onScreenShareStopped?.();
        });

        return stream;
      }
      return null;
    } catch (error) {
      console.error('Error sharing screen via LiveKit:', error);
      return null;
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (this.room) {
      try {
        await this.room.localParticipant.setScreenShareEnabled(false);
      } catch (e) {
        console.warn('Stop screen share error:', e);
      }
    }
  }

  public disconnect(): void {
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack = null;
    }
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack = null;
    }
    if (this.room) {
      this.room.disconnect();
      this.room = null;
    }
  }
}

export const livekitService = new LivekitService();
