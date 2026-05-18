const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log("%c[APP]", "color: #3182ce", ...args);
  },
  error: (...args) => {
    console.error("%c[ERROR]", "color: #DC143C", ...args);
  },
  warn: (...args) => {
    if (isDev) console.warn("%c[WARN]", "color: #d69e2e", ...args);
  },
  debug: (label, data) => {
    if (isDev) {
      console.group(`%c[DEBUG] ${label}`, "color: #a855f7; font-weight: bold");
      console.table(data);
      console.groupEnd();
    }
  },
};
