import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexxcloud.app',
  appName: 'NexxCloud',
  webDir: 'dist',
  server: {
    cleartext: true,
    allowNavigation: [
      'localhost',
      'localhost:*',
      '127.0.0.1',
      '127.0.0.1:*',
      '10.*.*.*',
      '172.16.*.*',
      '172.17.*.*',
      '172.18.*.*',
      '172.19.*.*',
      '172.20.*.*',
      '172.21.*.*',
      '172.22.*.*',
      '172.23.*.*',
      '172.24.*.*',
      '172.25.*.*',
      '172.26.*.*',
      '172.27.*.*',
      '172.28.*.*',
      '172.29.*.*',
      '172.30.*.*',
      '172.31.*.*',
      '192.168.*.*',
      '*.local',
      'nexxcloud.local'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,
      backgroundColor: '#060129',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      backgroundColor: '#04020a',
      style: 'DARK'
    },
    Keyboard: {
      resize: 'body'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
