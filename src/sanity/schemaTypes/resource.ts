export default {
  name: 'resource',
  title: 'Recurso',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Título del Recurso',
      type: 'string',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'category',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'MainStage', value: 'mainstage' },
          { title: 'Kontakt', value: 'kontakt' },
          { title: 'Sintetizadores', value: 'sintetizadores' },
          { title: 'Tutoriales', value: 'tutoriales' },
          { title: 'Software', value: 'software' },
        ],
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'description',
      title: 'Descripción Corta',
      type: 'text',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'mainImage',
      title: 'Imagen de Portada',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'youtubeVideoId',
      title: 'ID del Video de YouTube',
      description: 'Ejemplo: Si la URL es youtube.com/watch?v=dQw4w9WgXcQ, el ID es dQw4w9WgXcQ',
      type: 'string',
    },
    {
      name: 'downloadLink',
      title: 'Enlace de Descarga (Telegram o Acortador)',
      type: 'url',
    },
    {
      name: 'content',
      title: 'Contenido del Post',
      type: 'array',
      of: [{ type: 'block' }],
    },
  ],
};
