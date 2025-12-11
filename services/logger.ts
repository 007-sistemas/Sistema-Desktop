const isProd = process.env.NODE_ENV === 'production';

export function debug(...args: any[]) {
  if (!isProd) {
    console.log(...args);
  }
}

export function info(...args: any[]) {
  console.info(...args);
}

export function warn(...args: any[]) {
  console.warn(...args);
}

export function error(...args: any[]) {
  console.error(...args);
}
