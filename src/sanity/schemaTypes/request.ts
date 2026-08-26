export default {
  name: 'request',
  title: 'Peticiones (Telegram)',
  type: 'document',
  fields: [
    {
      name: 'user',
      title: 'Nombre',
      type: 'string',
    },
    {
      name: 'username',
      title: 'Username (@)',
      type: 'string',
    },
    {
      name: 'text',
      title: 'Petición',
      type: 'text',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'date',
      title: 'Fecha',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }
  ],
  preview: {
    select: {
      title: 'text',
      subtitle: 'user'
    }
  }
}
