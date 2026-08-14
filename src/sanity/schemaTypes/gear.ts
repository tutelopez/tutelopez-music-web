import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'gear',
  title: 'Equipo (My Gear)',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Nombre del Equipo',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Categoría',
      type: 'string',
      options: {
        list: [
          { title: 'Teclados / Sintetizadores', value: 'teclados' },
          { title: 'Interfaces / Audio', value: 'audio' },
          { title: 'Computadoras / Software', value: 'software' },
          { title: 'Accesorios', value: 'accesorios' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Por qué lo uso (Descripción Corta)',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Imagen del Producto',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'affiliateLink',
      title: 'Link de Afiliado (Amazon, Thomann, etc.)',
      type: 'url',
    }),
  ],
});
