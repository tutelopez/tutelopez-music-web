export default {
  name: 'subscriber',
  title: 'Suscriptor (Telegram)',
  type: 'document',
  fields: [
    {
      name: 'userId',
      title: 'Telegram User ID',
      type: 'number',
      description: 'El ID único del usuario en Telegram.',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'joinedAt',
      title: 'Fecha de Suscripción',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }
  ],
  preview: {
    select: {
      title: 'userId',
      subtitle: 'joinedAt'
    },
    prepare(selection: any) {
      const {title, subtitle} = selection
      return {
        title: `ID: ${title}`,
        subtitle: new Date(subtitle).toLocaleDateString()
      }
    }
  }
}
