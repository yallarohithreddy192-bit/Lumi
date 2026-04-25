let sharedAudioContext: AudioContext | null = null;

export function getAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
}

export async function playPCM(base64Data: string, sampleRate: number = 24000, mimeType: string | null = null) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const audioContext = getAudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  try {
    // If we have a mimeType and it's not pcm, or we just want to try decoding first (safest)
    if (!mimeType || !mimeType.includes('pcm')) {
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      return source;
    }
  } catch (err) {
    console.warn("decodeAudioData failed, falling back to manual PCM parsing", err);
  }

  // Fallback: Convert 16-bit signed PCM to 32-bit float
  const float32Array = new Float32Array(bytes.length / 2);
  const dataView = new DataView(bytes.buffer);
  
  for (let i = 0; i < float32Array.length; i++) {
    float32Array[i] = dataView.getInt16(i * 2, true) / 32768.0;
  }

  const buffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
  buffer.getChannelData(0).set(float32Array);

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
  
  return source;
}

export async function playNotificationSound() {
  const audioContext = getAudioContext();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
  oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.5); // A4

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.5);
}
