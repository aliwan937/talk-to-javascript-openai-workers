export class WavRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private sampleRate: number;

  constructor({ sampleRate = 24000 }) {
    this.sampleRate = sampleRate;
  }

  async begin() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 2048;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  async end() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.isRecording = false;
  }

  getFrequencies(type: 'voice' | 'music' = 'voice') {
    if (!this.analyser) {
      return { values: new Float32Array([0]) };
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    return { values: dataArray };
  }

  get recording() {
    return this.isRecording;
  }

  getStatus() {
    return this.isRecording ? 'recording' : 'stopped';
  }

  async pause() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      this.isRecording = false;
    }
  }

  async record(callback: (data: { mono: Float32Array }) => void) {
    if (!this.stream) {
      throw new Error('No stream available');
    }

    this.mediaRecorder = new MediaRecorder(this.stream);
    this.isRecording = true;

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        const arrayBuffer = await event.data.arrayBuffer();
        const audioContext = new AudioContext({ sampleRate: this.sampleRate });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const mono = audioBuffer.getChannelData(0);
        callback({ mono });
        await audioContext.close();
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
  }

  static async decode(audioData: ArrayBuffer, sampleRate: number, targetSampleRate: number) {
    const audioContext = new AudioContext({ sampleRate });
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const mono = audioBuffer.getChannelData(0);
    await audioContext.close();
    return mono;
  }
}

export class WavStreamPlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private sampleRate: number;

  constructor({ sampleRate = 24000 }) {
    this.sampleRate = sampleRate;
  }

  async connect() {
    this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
  }

  async interrupt() {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    return null;
  }

  getFrequencies(type: 'voice' | 'music' = 'voice') {
    if (!this.analyser) {
      return { values: new Float32Array([0]) };
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    return { values: dataArray };
  }

  async add16BitPCM(data: ArrayBuffer, trackId: string) {
    if (!this.audioContext || !this.analyser) {
      throw new Error('Audio context not initialized');
    }

    const audioBuffer = await this.audioContext.decodeAudioData(data);
    this.source = this.audioContext.createBufferSource();
    this.source.buffer = audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);
    this.source.start();
  }
} 