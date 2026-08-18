import Peer from 'peerjs';
import type { MediaConnection, DataConnection } from 'peerjs';
import { WEBRTC_AUDIO_CONSTRAINTS } from '../constants';

export interface PeerServiceEvents {
  onLocalStream?: (stream: MediaStream) => void;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onRemoteScreenStream?: (stream: MediaStream) => void;
  onRemoteScreenStreamEnded?: () => void;
  onPeerDisconnected?: (peerId: string) => void;
  onDataReceived?: (data: unknown) => void;
  onConnectionStatusChange?: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'permission_denied') => void;
  onScreenShareStopped?: () => void;
  onNetworkQualityChange?: (peerId: string, status: 'good' | 'poor') => void;
  onTrackEnded?: (kind: 'audio' | 'video') => void;
}

export class PeerService {
  private peer: Peer | null = null;
  private screenPeer: Peer | null = null;
  public localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private calls: Map<string, MediaConnection> = new Map();
  private screenCalls: Map<string, MediaConnection> = new Map();
  private dataConnections: Map<string, DataConnection> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private events: PeerServiceEvents = {};
  private activeConnectionId: string = '';
  private statsInterval: any = null;
  private prevStats: Map<string, { lost: number; received: number }> = new Map();

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
          this.startStatsMonitoring();
          resolve(id);
        });

        this.peer.on('call', (call) => {
          if (call.peer.endsWith('_screen')) {
            call.answer();
            call.on('stream', (remoteScreenStream) => {
              this.events.onRemoteScreenStream?.(remoteScreenStream);
            });
            call.on('close', () => {
              this.events.onRemoteScreenStreamEnded?.();
            });
            call.on('error', () => {
              this.events.onRemoteScreenStreamEnded?.();
            });
            return;
          }

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

      const baseDelay = 1000; // 1s
      const maxDelay = 16000; // 16s
      const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
      const jitter = Math.random() * 1000; // 0-1s random jitter
      const finalDelay = delay + jitter;

      setTimeout(() => {
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      }, finalDelay);
    } else {
      this.events.onConnectionStatusChange?.('disconnected');
    }
  }

  private startStatsMonitoring(): void {
    if (this.statsInterval) return;

    this.statsInterval = setInterval(() => {
      if (this.calls.size === 0) return;

      this.calls.forEach(async (call, peerId) => {
        const pc = call.peerConnection;
        if (!pc || pc.connectionState !== 'connected') return;

        try {
          const stats = await pc.getStats();
          let currentLost = 0;
          let currentReceived = 0;

          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              currentLost += report.packetsLost || 0;
              currentReceived += report.packetsReceived || 0;
            }
          });

          const prev = this.prevStats.get(peerId);
          if (prev) {
            const deltaLost = currentLost - prev.lost;
            const deltaReceived = currentReceived - prev.received;
            const totalPackets = deltaLost + deltaReceived;

            if (totalPackets > 50) {
              const lossRate = deltaLost / totalPackets;
              if (lossRate > 0.10) { // 10% packet loss threshold
                this.events.onNetworkQualityChange?.(peerId, 'poor');
              } else {
                this.events.onNetworkQualityChange?.(peerId, 'good');
              }
            }
          }

          this.prevStats.set(peerId, { lost: currentLost, received: currentReceived });
        } catch (e) {
          console.warn('getStats monitoring error:', e);
        }
      });
    }, 3000);
  }

  private stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.prevStats.clear();
  }

  public async startLocalMedia(audio: boolean = true, video: boolean = true): Promise<MediaStream | null> {
    try {
      // Check existing tracks in localStream
      const existingAudio = this.localStream?.getAudioTracks().find((t) => t.readyState === 'live');
      const existingVideo = this.localStream?.getVideoTracks().find((t) => t.readyState === 'live');

      const needAudio = audio && !existingAudio;
      const needVideo = video && !existingVideo;

      // If we don't have localStream, or we need new tracks from getUserMedia
      if (needAudio || needVideo || !this.localStream) {
        const constraints: MediaStreamConstraints = {
          audio: needAudio ? WEBRTC_AUDIO_CONSTRAINTS : false,
          video: needVideo
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
                facingMode: 'user',
              }
            : false,
        };

        if (needAudio || needVideo) {
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);

          if (!this.localStream) {
            this.localStream = new MediaStream();
          }

          newStream.getTracks().forEach((track) => {
            track.onended = () => {
              this.events.onTrackEnded?.(track.kind as 'audio' | 'video');
            };
            this.localStream?.addTrack(track);
          });
        }
      }

      if (!this.localStream) {
        this.localStream = new MediaStream();
      }

      const stream = this.localStream;
      this.events.onLocalStream?.(stream);

      // Attach track ended listeners to all existing tracks as well
      stream.getTracks().forEach((track) => {
        if (!track.onended) {
          track.onended = () => {
            this.events.onTrackEnded?.(track.kind as 'audio' | 'video');
          };
        }
      });

      // Synchronize senders across all active peer calls
      const peersToRecall: string[] = [];

      this.calls.forEach((call, peerId) => {
        const pc = call.peerConnection;
        if (!pc || pc.connectionState === 'closed') {
          peersToRecall.push(peerId);
          return;
        }

        const senders = pc.getSenders();
        let needsRecall = false;

        stream.getTracks().forEach((track) => {
          const existingSender = senders.find((s) => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track).catch((err) => {
              console.warn(`replaceTrack failed for ${peerId}:`, err);
              needsRecall = true;
            });
          } else {
            // No existing sender for this kind of track -> Need renegotiation
            try {
              pc.addTrack(track, stream);
            } catch {
              needsRecall = true;
            }
          }
        });

        if (needsRecall) {
          peersToRecall.push(peerId);
        }
      });

      // Gracefully re-call peers that require renegotiation so connection is NEVER broken
      peersToRecall.forEach((peerId) => {
        try {
          const oldCall = this.calls.get(peerId);
          if (oldCall) {
            oldCall.close();
            this.calls.delete(peerId);
          }
          this.callPeer(peerId);
        } catch (e) {
          console.warn(`Error recalling peer ${peerId}:`, e);
        }
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

  public async startScreenShare(targetConnectionIds: string[] = []): Promise<MediaStream | null> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported on this browser');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        } as MediaTrackConstraints,
        audio: false,
      });

      // Set contentHint to 'text' to ensure sharpness of text and documents
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'contentHint' in videoTrack) {
        videoTrack.contentHint = 'text';
      }

      this.screenStream = stream;

      const screenPeerId = `${this.activeConnectionId}_screen`;
      this.screenPeer = new Peer(screenPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ],
        },
      });

      this.screenPeer.on('open', () => {
        targetConnectionIds.forEach((targetId) => {
          this.callScreenToPeer(targetId);
        });
      });

      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      return null;
    }
  }

  public callScreenToPeer(targetConnectionId: string): void {
    if (!this.screenPeer || !this.screenStream || this.screenPeer.destroyed) return;
    if (this.screenCalls.has(targetConnectionId)) return;
    try {
      const screenCall = this.screenPeer.call(targetConnectionId, this.screenStream);
      if (screenCall) {
        this.screenCalls.set(targetConnectionId, screenCall);
      }
    } catch (e) {
      console.warn('Call screen to peer error:', e);
    }
  }

  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    this.screenCalls.forEach((call) => {
      try {
        call.close();
      } catch {}
    });
    this.screenCalls.clear();

    if (this.screenPeer) {
      try {
        this.screenPeer.destroy();
      } catch {}
      this.screenPeer = null;
    }

    this.events.onScreenShareStopped?.();
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
    this.stopScreenShare();
    this.stopStatsMonitoring();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    // Explicitly close all active media connections before clearing
    this.calls.forEach((call) => {
      try {
        call.close();
      } catch {}
    });
    this.calls.clear();

    this.screenCalls.forEach((call) => {
      try {
        call.close();
      } catch {}
    });
    this.screenCalls.clear();

    // Close all data connections
    this.dataConnections.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    this.dataConnections.clear();

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const peerService = new PeerService();
