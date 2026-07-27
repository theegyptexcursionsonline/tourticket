export const WORK_EMAIL_PATTERN =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const isValidWorkEmail = (email: string) =>
  WORK_EMAIL_PATTERN.test(email);
