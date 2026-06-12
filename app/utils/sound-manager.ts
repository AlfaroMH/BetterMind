import { Audio } from 'expo-av';

class SoundManager {
  private sounds: Record<string, Audio.Sound> = {};
  private bgMusic: Audio.Sound | null = null;
  private globalVolume: number = 0.5;
  private isMuted: boolean = false;

  async setVolume(value: number) {
    this.globalVolume = value;
    if (this.bgMusic) {
      await this.bgMusic.setVolumeAsync(this.isMuted ? 0 : this.globalVolume * 0.3);
    }
  }

  getVolume() {
    return this.globalVolume;
  }

  async playSound(type: 'correct' | 'incorrect' | 'click' | 'success' | 'timer' | 'fail') {
    try {
      // Si el sonido ya existe, lo reiniciamos
      if (this.sounds[type]) {
        const status = await this.sounds[type].getStatusAsync();
        if (status.isLoaded) {
          await this.sounds[type].replayAsync();
          return;
        }
      }

      let source;
      switch (type) {
        case 'correct': source = require('@/assets/sounds/correct2.mp3'); break;
        case 'incorrect': source = require('@/assets/sounds/incorrect2.mp3'); break;
        case 'click': source = require('@/assets/sounds/click2.mp3'); break;
        case 'success': source = require('@/assets/sounds/success.mp3'); break;
        case 'timer': source = require('@/assets/sounds/timer.mp3'); break;
        case 'fail': source = require('@/assets/sounds/fail.mp3'); break;
      }

      const { sound } = await Audio.Sound.createAsync(source);
      this.sounds[type] = sound;
      await sound.setVolumeAsync(this.globalVolume);
      await sound.playAsync();
    } catch (error) {
      console.log('Error al reproducir sonido:', error);
    }
  }

  async startBackgroundMusic() {
    try {
      if (this.bgMusic) {
        const status = await this.bgMusic.getStatusAsync();
        if (status.isLoaded) {
          if (!status.isPlaying) {
            await this.bgMusic.playAsync();
          }
          return;
        }
      }
      
      console.log('LOG: Iniciando música de fondo...');
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/bg_menu.mp3'),
        { shouldPlay: true, isLooping: true, volume: this.globalVolume * 0.3 }
      );
      this.bgMusic = sound;

      // Intentar reproducir de nuevo si falla por políticas de autoplay
      const status = await this.bgMusic.getStatusAsync();
      if (status.isLoaded && !status.isPlaying) {
        await this.bgMusic.playAsync().catch(e => console.log("Autoplay blocked:", e));
      }
    } catch (error) {
      console.log('Error al iniciar música de fondo:', error);
    }
  }

  async restartBackgroundMusic() {
    await this.stopBackgroundMusic();
    await this.startBackgroundMusic();
  }

  async pauseBackgroundMusic() {
    if (this.bgMusic) {
      await this.bgMusic.pauseAsync();
    }
  }

  async setLowVolume(isLow: boolean) {
    if (this.bgMusic) {
      const targetVol = isLow ? this.globalVolume * 0.05 : this.globalVolume * 0.3;
      await this.bgMusic.setVolumeAsync(this.isMuted ? 0 : targetVol);
    }
  }

  async stopBackgroundMusic() {
    if (this.bgMusic) {
      await this.bgMusic.stopAsync();
      await this.bgMusic.unloadAsync();
      this.bgMusic = null;
    }
  }
}

export const soundManager = new SoundManager();
