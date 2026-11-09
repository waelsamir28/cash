import readline from "node:readline";

/**
 * يطلب كلمة سر دون إظهارها على الشاشة.
 * للاختبار الآلي فقط: لو موجود المتغير ALGAMAL_ADMIN_PASSWORD يُستخدم بدل السؤال.
 */
export function askSecret(question) {
  if (process.env.ALGAMAL_ADMIN_PASSWORD !== undefined) {
    return Promise.resolve(process.env.ALGAMAL_ADMIN_PASSWORD);
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    // نخفي ما يكتبه المستخدم بعد ظهور السؤال مباشرة
    rl._writeToOutput = (text) => {
      if (!muted) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}
