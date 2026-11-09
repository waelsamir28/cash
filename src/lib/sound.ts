/**
 * تشغيل صوت خفيف عند اختيار صنف - متوافق مع المتصفح
 * يستخدم Web Audio API لتوليد نغمة بدون ملفات خارجية
 */
export function playSelectSound(): void {
  try {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch {
    // تجاهل أخطاء الصوت (المتصفح قد يمنعه قبل تفاعل المستخدم)
  }
}
