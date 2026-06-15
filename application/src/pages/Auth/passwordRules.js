export const PASSWORD_RE = /^(?=.*[A-Za-zА-Яа-яЁё])(?=.*[\d\W_]).{8,}$/

export function passwordChecks(pwd) {
  return {
    long: pwd.length >= 8,
    letter: /[A-Za-zА-Яа-яЁё]/.test(pwd),
    nonAlpha: /[\d\W_]/.test(pwd),
  }
}
