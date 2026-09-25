export default {
  name: 'stagekeys_suggestion',
  title: 'Stage Keys Live - Sugerencias',
  type: 'document',
  fields: [
    {
      name: 'suggestion',
      title: 'Función o Sugerencia',
      type: 'text',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'author',
      title: 'Nombre o Alias',
      type: 'string',
    },
    {
      name: 'contact',
      title: 'Contacto (Email o Telegram)',
      type: 'string',
    },
    {
      name: 'status',
      title: 'Estado de la sugerencia',
      type: 'string',
      options: {
        list: [
          { title: 'Nueva', value: 'nueva' },
          { title: 'En Revisión', value: 'en_revision' },
          { title: 'Aprobada para Desarrollo', value: 'aprobada' },
          { title: 'Implementada', value: 'implementada' },
        ],
      },
      initialValue: 'nueva',
    },
    {
      name: 'createdAt',
      title: 'Fecha de Envío',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }
  ],
  preview: {
    select: {
      title: 'suggestion',
      subtitle: 'author'
    }
  }
};
