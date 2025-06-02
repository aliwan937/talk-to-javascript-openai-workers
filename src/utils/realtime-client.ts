// @ts-ignore
import { EventEmitter } from 'events';

export interface ItemType {
  id: string;
  role?: string;
  type?: string;
  status: string;
  formatted: {
    text?: string;
    transcript?: string;
    audio?: ArrayBuffer;
    tool?: any;
    file?: Float32Array;
  };
}

export class Conversation {
  private items: ItemType[] = [];

  getItems(): ItemType[] {
    return [...this.items];
  }

  addItem(item: ItemType) {
    this.items.push(item);
  }

  removeItem(id: string) {
    this.items = this.items.filter(item => item.id !== id);
  }
}

interface SessionResponse {
  sdp: string;
}

export interface TrackSampleOffset {
  trackId: string;
  offset: number;
}

export class RealtimeClient extends EventEmitter {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private url: string;
  private sessionConfig: any = {};
  public conversation: Conversation;
  public remoteAudioStream: MediaStream | null = null;

  constructor(options: { url: string }) {
    super();
    this.url = options.url;
    this.conversation = new Conversation();
  }

  public async connect(instructions?: string) {
    try {
      // 1. Create PeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // 2. Add microphone tracks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTransceiver(track, { direction: 'sendrecv' });
      });

      // 3. Handle incoming audio tracks
      this.peerConnection.ontrack = (event) => {
        if (!this.remoteAudioStream) {
          this.remoteAudioStream = new MediaStream();
        }
        event.streams[0].getAudioTracks().forEach((track) => {
          this.remoteAudioStream!.addTrack(track);
        });
        this.emit('audio', this.remoteAudioStream);
      };

      // 4. Create data channel
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannel();

      // 5. Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 6. Get ephemeral key from /api/session, sending instructions
      const tokenResponse = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      });
      const tokenData = await tokenResponse.json() as { result: { client_secret: { value: string } } };
      const EPHEMERAL_KEY = tokenData.result.client_secret.value;
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      // 7. Send offer SDP to OpenAI Realtime API
      const openaiResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });
      const answer = await openaiResponse.text();
      // 8. Set remote description
      await this.peerConnection.setRemoteDescription({
        sdp: answer,
        type: 'answer',
      });
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.emit('connected');
      // Send initial session update (tools, modalities, etc.)
      this.configureData();
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.emit('disconnected');
    };
  }

  private configureData() {
    if (!this.dataChannel) return;
    const event = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        tools: [
          // You can add tool definitions here if needed
        ],
      },
    };
    this.dataChannel.send(JSON.stringify(event));
  }

  private handleMessage(message: any) {
    if (message.type === 'conversation_update') {
      this.conversation.addItem(message.item);
      this.emit('conversation.updated', message);
    } else if (message.type === 'error') {
      this.emit('error', message.error);
    }
    // Handle function call messages if needed
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.peerConnection = null;
    this.dataChannel = null;
    this.remoteAudioStream = null;
  }

  sendUserMessageContent(content: any[]) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }
    this.dataChannel.send(JSON.stringify({
      type: 'user_message',
      content
    }));
  }

  appendInputAudio(audioData: Float32Array) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }
    this.dataChannel.send(JSON.stringify({
      type: 'input_audio',
      data: Array.from(audioData)
    }));
  }

  updateSession(config: any) {
    this.sessionConfig = { ...this.sessionConfig, ...config };
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'session_update',
        config: this.sessionConfig
      }));
    }
  }

  getTurnDetectionType(): string {
    return this.sessionConfig.turn_detection?.type || 'none';
  }

  isConnected(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  reset() {
    this.conversation = new Conversation();
    this.sessionConfig = {};
    this.remoteAudioStream = null;
  }

  async cancelResponse(trackId: string, offset: number) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }
    this.dataChannel.send(JSON.stringify({
      type: 'cancel_response',
      trackId,
      offset
    }));
  }
} 