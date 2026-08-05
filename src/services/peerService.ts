import Peer from 'peerjs';
import type { MediaConnection, DataConnection } from 'peerjs';
import { WEBRTC_AUDIO_CONSTRAINTS } from '../constants';

export interface PeerServiceEvents {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onDataReceived?: (data: unknown) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'permission_denied') => void;
}

export class PeerService {
  private peer: Peer | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private calls: Map<string, MediaConnection> = new Map();
  private dataConnections: Map<string, DataConnection> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private events: PeerServiceEvents = {};
  private activeConnectionId: string = '';

  // Version 4.0: Unique Connection ID Generator per device tab
  public generateUniqueConnectionId(userId: string): string {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const rand = Math.random().toString(36).substr(2, 4);
    return `${cleanUserId}_${Date.now()}_${rand}`;
  }

  public initialize(userId: string, events: PeerServiceEvents): Promise<string> {
    this.events = events;
    this.reconnectAttempts = 0;
    this.activeConnectionId = this.generateUniqueConnectionId(userId);

    return new Promise((resolve) => {
      this.events.onConnectionStatusChange?.('connecting');

      try {
        this.peer = new Peer(this.activeConnectionId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
            ],
          },
        });

        this.peer.on('open', (id) => {
          this.activeConnectionId = id;
          this.reconnectAttempts = 0;
          this.events.onConnectionStatusChange?.('connected');
          resolve(id);
        });

        this.peer.on('call', (call) => {
          if (this.localStream) {
            call.answer(this.localStream);
          } else {
            call.answer();
          }
          this.handleCall(call);
        });

        this.peer.on('connection', (conn) => {
          this.handleDataConnection(conn);
        });

        this.peer.on('disconnected', () => {
          this.handleReconnect();
        });

        this.peer.on('error', (err) => {
          console.warn('PeerJS Warning:', err);
          if (err.type !== 'peer-unavailable') {
            this.handleReconnect();
          }
        });
      } catch (error) {
        console.error('PeerJS init failed, entering standalone mode', error);
        this.events.onConnectionStatusChange?.('connected');
        resolve(this.activeConnectionId);
      }
    });
  }

  public get getConnectionId(): string {
    return this.activeConnectionId;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.events.onConnectionStatusChange?.('reconnecting');
      setTimeout(() => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      }, 2000 * this.reconnectAttempts);
    } else {
      this.events.onConnectionStatusChange?.('disconnected');
    }
  }

  public async startLocalMedia(audio: boolean = true, video: boolean = true): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: audio ? WEBRTC_AUDIO_CONSTRAINTS : false,
        video: video ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      this.events.onLocalStream?.(stream);

      this.calls.forEach((call) => {
        const sender = call.peerConnection.getSenders();
        stream.getTracks().forEach((track) => {
          const existingSender = sender.find((s) => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track);
          }
        });
      });

      return stream;
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.events.onConnectionStatusChange?.('permission_denied');
      } else {
        console.error('Error accessing media devices:', error);
      }
      return null;
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported on this browser');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: false,
      });

      this.screenStream = stream;

      // Swap track in localStream so that new connections automatically receive the screen share track
      if (this.localStream && stream.getVideoTracks().length > 0) {
        const localVideoTrack = this.localStream.getVideoTracks()[0];
        if (localVideoTrack) {
          this.localStream.removeTrack(localVideoTrack);
        }
        this.localStream.addTrack(stream.getVideoTracks()[0]);
      }

      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      return null;
    }
  }

  public replaceVideoTrack(track: MediaStreamTrack | null): void {
    this.calls.forEach((call) => {
      const senders = call.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(track);
      }
    });
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
  }

  public callPeer(targetConnectionId: string): void {
    if (!this.peer || this.peer.destroyed) return;
    try {
      const call = this.localStream ? this.peer.call(targetConnectionId, this.localStream) : this.peer.call(targetConnectionId, new MediaStream());
      this.handleCall(call);

      const conn = this.peer.connect(targetConnectionId);
      this.handleDataConnection(conn);
    } catch (e) {
      console.warn('Call peer error:', e);
    }
  }

  private handleCall(call: MediaConnection): void {
    this.calls.set(call.peer, call);

    call.on('stream', (remoteStream) => {
      this.events.onRemoteStream?.(call.peer, remoteStream);
    });

    call.on('close', () => {
      this.calls.delete(call.peer);
      this.events.onPeerDisconnected?.(call.peer);
    });

    call.on('error', () => {
      this.calls.delete(call.peer);
      this.events.onPeerDisconnected?.(call.peer);
    });
  }

  private handleDataConnection(conn: DataConnection): void {
    this.dataConnections.set(conn.peer, conn);

    conn.on('data', (data) => {
      this.events.onDataReceived?.(data);
    });

    conn.on('close', () => {
      this.dataConnections.delete(conn.peer);
    });
  }

  public broadcastData(data: unknown): void {
    this.dataConnections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  public toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public disconnect(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.calls.clear();
    this.dataConnections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const peerService = new PeerService();
