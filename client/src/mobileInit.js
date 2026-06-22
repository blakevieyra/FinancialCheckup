/** Native shell hooks when running inside the Capacitor Android/iOS wrapper. */
export async function initMobileShell() {
  if (typeof window === 'undefined') return;

  let Capacitor;
  try {
    ({ Capacitor } = await import('@capacitor/core'));
  } catch {
    return;
  }
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const { StatusBar, Style } = await import('@capacitor/status-bar');

    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0f1a' });
    await SplashScreen.hide();

    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch {
    /** Plugins unavailable — ignore. */
  }
}
