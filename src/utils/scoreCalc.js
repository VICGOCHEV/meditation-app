export function calcIS(q1, q2, q3, q4) {
  return q1 + q2 + q3 + q4
}

export function interpretIS(score) {
  if (score <= 10)
    return {
      state: 'Шторм',
      text:
        'Твой ментальный шум сейчас на пике. Это нормально. Давай просто подышим 5 минут, не ставя никаких целей',
    }
  if (score <= 20)
    return {
      state: 'Туман',
      text:
        'Похоже, мысли о будущем или прошлом немного заслоняют настоящий момент. Практика поможет вернуть ясность',
    }
  if (score <= 30)
    return {
      state: 'Ясность',
      text:
        'Хороший контакт с телом и умеренный уровень мыслей. Отличная база, чтобы углубить состояние',
    }
  return {
    state: 'Поток',
    text:
      'Ты в глубоком контакте с собой. Сегодняшняя практика станет для тебя не просто отдыхом, а настоящим исследованием',
  }
}

export function calcIT(q1, q2, q3, q4, q5) {
  return (q1 + q2 + q3 + q4 + q5) / 5
}

export function calcIO(q6, q7, q8, q9, q10) {
  return (q6 + q7 + q8 + q9 + q10) / 5
}

export function calcKT(IO, IT) {
  return IO - IT
}

export function interpretKT(kt) {
  if (kt > 0)
    return {
      text: 'Твоя осознанность растёт. Мысли о будущем стали тише',
      emoji: '🌱',
    }
  return {
    text: 'Сейчас время заземления. Практика поможет стабилизировать состояние',
    emoji: '🌿',
  }
}
