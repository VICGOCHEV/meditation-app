import AudioCollection from '../components/AudioCollection.jsx'

const cfg = {
  title: 'Голоса проводника',
  addLabel: 'Добавить голос',
  endpoint: '/admin/voices',
  itemKey: 'voice',
  fields: [
    { key: 'name', label: 'Название', placeholder: 'Мужской' },
    { key: 'code', label: 'Код', placeholder: 'male', mono: true, grow: false },
  ],
  makeDraft: () => ({ name: '', code: '' }),
}

export default function Voices() {
  return <AudioCollection cfg={cfg} />
}
