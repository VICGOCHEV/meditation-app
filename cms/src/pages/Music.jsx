import AudioCollection from '../components/AudioCollection.jsx'

const cfg = {
  title: 'Музыка · «Энергии»',
  addLabel: 'Добавить трек',
  endpoint: '/admin/music',
  itemKey: 'track',
  fields: [{ key: 'title', label: 'Название', placeholder: 'Энергия созидания' }],
  makeDraft: () => ({ title: '' }),
}

export default function Music() {
  return <AudioCollection cfg={cfg} />
}
