export const calcIS = (q1, q2, q3, q4) => Number(q1) + Number(q2) + Number(q3) + Number(q4)
export const calcIT = (q1, q2, q3, q4, q5) =>
  (Number(q1) + Number(q2) + Number(q3) + Number(q4) + Number(q5)) / 5
export const calcIO = (q6, q7, q8, q9, q10) =>
  (Number(q6) + Number(q7) + Number(q8) + Number(q9) + Number(q10)) / 5
export const calcKT = (io, it) => io - it
